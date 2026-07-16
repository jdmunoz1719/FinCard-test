output "ec2_public_ip" {
  description = "IP publica de la EC2"
  value       = aws_instance.app.public_ip
}

output "app_url" {
  description = "URL para acceder a la API una vez que termino el bootstrap (~1-2 min despues de terraform apply)"
  value       = "http://${aws_instance.app.public_ip}:${var.app_port}"
}

output "ssh_connection" {
  description = "Comando para conectarte y revisar logs de arranque si algo falla"
  value       = "ssh -i fincard-deploy-key ubuntu@${aws_instance.app.public_ip}"
}
