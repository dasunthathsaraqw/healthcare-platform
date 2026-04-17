Write-Host " Deploying Healthcare Platform to Kubernetes..." -ForegroundColor Green

# Create namespace
kubectl create namespace healthcare

# Apply secrets
kubectl apply -f kubernetes/secrets.yaml

# Apply MongoDB databases
kubectl apply -f kubernetes/mongodb/

# Apply RabbitMQ
kubectl apply -f kubernetes/rabbitmq/

# Apply all services
kubectl apply -f kubernetes/patient-service/
kubectl apply -f kubernetes/doctor-service/
kubectl apply -f kubernetes/appointment-service/
kubectl apply -f kubernetes/payment-service/
kubectl apply -f kubernetes/notification-service/
kubectl apply -f kubernetes/ai-symptom-checker/
kubectl apply -f kubernetes/api-gateway/
kubectl apply -f kubernetes/frontend/

# Apply ingress
kubectl apply -f kubernetes/ingress.yaml

Write-Host "✅ Deployment complete!" -ForegroundColor Green

# Show status
kubectl get pods -n healthcare
kubectl get services -n healthcare
kubectl get ingress -n healthcare