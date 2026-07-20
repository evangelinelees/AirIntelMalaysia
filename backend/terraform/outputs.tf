output "orchestrator_public_ip" {
  description = "Public IP of the n8n/orchestrator box — point your DNS A record here"
  value       = oci_core_instance.airintel_orchestrator.public_ip
}

output "ssh_command" {
  description = "Quick SSH command to reach the box once it's up"
  value       = "ssh ubuntu@${oci_core_instance.airintel_orchestrator.public_ip}"
}
