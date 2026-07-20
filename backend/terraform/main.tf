terraform {
  required_providers {
    oci = {
      source  = "oracle/oci"
      version = ">= 5.0"
    }
  }
}

provider "oci" {
  tenancy_ocid     = var.tenancy_ocid
  user_ocid        = var.user_ocid
  fingerprint      = var.fingerprint
  private_key_path = var.private_key_path
  region           = var.region
}

# ------------------------------------------------------------------
# Networking: one VCN, one public subnet, an internet gateway,
# and a security list that only opens 22 (SSH), 443 (nginx/n8n TLS)
# and 5678 restricted to localhost via nginx — so 5678 is NOT public.
# ------------------------------------------------------------------
resource "oci_core_vcn" "airintel_vcn" {
  compartment_id = var.compartment_ocid
  cidr_block     = "10.0.0.0/16"
  display_name   = "airintel-vcn"
  dns_label      = "airintelvcn"
}

resource "oci_core_internet_gateway" "airintel_igw" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.airintel_vcn.id
  display_name   = "airintel-igw"
}

resource "oci_core_route_table" "airintel_rt" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.airintel_vcn.id
  display_name   = "airintel-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    network_entity_id = oci_core_internet_gateway.airintel_igw.id
  }
}

resource "oci_core_security_list" "airintel_sl" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.airintel_vcn.id
  display_name   = "airintel-security-list"

  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }

  ingress_security_rules {
    protocol = "6" # TCP
    source   = "0.0.0.0/0"
    tcp_options { min = 22, max = 22 }
    description = "SSH admin access"
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 443, max = 443 }
    description = "HTTPS — nginx reverse proxy to n8n webhooks"
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options { min = 80, max = 80 }
    description = "HTTP — used only for Let's Encrypt ACME challenge"
  }
  # NOTE: port 5678 (n8n) is intentionally NOT opened here.
  # nginx proxies to it over localhost only — see backend/docker/nginx.conf
}

resource "oci_core_subnet" "airintel_subnet" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.airintel_vcn.id
  cidr_block                 = "10.0.1.0/24"
  display_name               = "airintel-public-subnet"
  route_table_id             = oci_core_route_table.airintel_rt.id
  security_list_ids          = [oci_core_security_list.airintel_sl.id]
  prohibit_public_ip_on_vnic = false
  dns_label                  = "airintelsub"
}

# ------------------------------------------------------------------
# Compute: Always-Free Ampere A1 Flex — 2 OCPU / 12GB RAM / Ubuntu
# ------------------------------------------------------------------
resource "oci_core_instance" "airintel_orchestrator" {
  compartment_id      = var.compartment_ocid
  availability_domain  = var.availability_domain
  shape               = "VM.Standard.A1.Flex"
  display_name        = "airintel-n8n-orchestrator"

  shape_config {
    ocpus         = 2
    memory_in_gbs = 12
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.airintel_subnet.id
    assign_public_ip = true
    hostname_label   = "airintel-orchestrator"
  }

  source_details {
    source_type = "image"
    source_id   = var.ubuntu_image_ocid # Canonical Ubuntu 22.04 aarch64 image OCID for your region
  }

  metadata = {
    ssh_authorized_keys = file(var.ssh_public_key_path)
    # cloud-init installs Docker + Docker Compose on first boot so the
    # instance is ready for `docker compose up` the moment you SSH in.
    user_data = base64encode(<<-EOF
      #!/bin/bash
      apt-get update -y
      apt-get install -y docker.io docker-compose-plugin ufw
      systemctl enable --now docker
      usermod -aG docker ubuntu
      ufw allow 22/tcp
      ufw allow 80/tcp
      ufw allow 443/tcp
      ufw --force enable
    EOF
    )
  }
}

# ------------------------------------------------------------------
# Budget alert — fires at 80% of a $0 (always-free) safety threshold
# so you get emailed the moment anything would incur a charge.
# ------------------------------------------------------------------
resource "oci_budget_budget" "airintel_budget" {
  compartment_id = var.tenancy_ocid
  amount         = var.budget_ceiling_usd
  reset_period   = "MONTHLY"
  target_type    = "COMPARTMENT"
  targets        = [var.compartment_ocid]
  display_name   = "airintel-cost-guardrail"
}

resource "oci_budget_alert_rule" "airintel_budget_alert" {
  budget_id      = oci_budget_budget.airintel_budget.id
  display_name   = "airintel-80-percent-alert"
  type           = "ACTUAL"
  threshold      = 80
  threshold_type = "PERCENTAGE"
  recipients     = var.budget_alert_email
}
