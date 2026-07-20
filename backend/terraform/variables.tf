variable "tenancy_ocid" {
  description = "OCI tenancy OCID (Profile > Tenancy in OCI Console)"
  type        = string
}

variable "user_ocid" {
  description = "Your OCI user OCID"
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the API signing key you generated in OCI Console"
  type        = string
}

variable "private_key_path" {
  description = "Local path to the private key matching the fingerprint above"
  type        = string
}

variable "region" {
  description = "OCI region, e.g. ap-singapore-1 (closest free-tier region to Malaysia)"
  type        = string
  default     = "ap-singapore-1"
}

variable "compartment_ocid" {
  description = "Compartment OCID to deploy into (root compartment is fine for a solo project)"
  type        = string
}

variable "availability_domain" {
  description = "AD name, e.g. 'xXXX:AP-SINGAPORE-1-AD-1' — find via `oci iam availability-domain list`"
  type        = string
}

variable "ubuntu_image_ocid" {
  description = "Canonical Ubuntu 22.04 (aarch64) image OCID for your chosen region — look this up in the OCI image catalog since image OCIDs are region-specific"
  type        = string
}

variable "ssh_public_key_path" {
  description = "Path to your local id_rsa.pub (or similar) for SSH access to the instance"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "budget_ceiling_usd" {
  description = "Budget ceiling for the alert — set low (e.g. 5) since everything here should run on the free tier"
  type        = number
  default     = 5
}

variable "budget_alert_email" {
  description = "Email address(es) to notify when the budget threshold is hit"
  type        = list(string)
}
