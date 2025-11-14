# Health Checks Guide

## Обзор

Health checks позволяют мониторить состояние приложения и быстро обнаруживать проблемы.

### Типы проверок:
- 🟢 **Liveness** - процесс жив и отвечает
- 🔵 **Readiness** - готов принимать трафик
- 🟡 **Startup** - успешно запустился
- 🔍 **Full** - полная диагностика

## Endpoints

### GET /api/health?type=full

Полная проверка всех компонентов.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T16:00:00Z",
  "uptime": 86400,
  "checks": {
    "database": {
      "status": "healthy",
      "responseTime": "45ms",
      "message": "Database connection successful"
    },
    "environment": {
      "status": "healthy",
      "message": "All required environment variables present"
    },
    "memory": {
      "status": "healthy",
      "heapUsed": "45 MB",
      "heapTotal": "100 MB",
      "percentage": "45%"
    },
    "version": {
      "status": "healthy",
      "version": "v1.15.0"
    }
  }
}
```

### GET /api/health?type=liveness

Проверка что процесс жив (для Kubernetes liveness probe).

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "process": {
      "status": "healthy",
      "message": "Process is responsive"
    }
  }
}
```

### GET /api/health?type=readiness

Проверка готовности (для Kubernetes readiness probe).

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "database": { "status": "healthy" },
    "environment": { "status": "healthy" }
  }
}
```

## Status Codes

- **200 OK** - `healthy` или `degraded`
- **503 Service Unavailable** - `unhealthy`

## Kubernetes Integration

### Deployment config

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mafclub-api
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: mafclub/api:latest
        ports:
        - containerPort: 3000

        # Liveness probe
        livenessProbe:
          httpGet:
            path: /api/health?type=liveness
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3

        # Readiness probe
        readinessProbe:
          httpGet:
            path: /api/health?type=readiness
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2

        # Startup probe
        startupProbe:
          httpGet:
            path: /api/health?type=startup
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 10
          timeoutSeconds: 3
          failureThreshold: 30
```

## Monitoring Integration

### Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'mafclub-health'
    metrics_path: '/api/health'
    params:
      type: ['full']
    static_configs:
      - targets: ['api.mafclub.com']
```

### Datadog

```javascript
// Send health check to Datadog
const response = await fetch('https://api.mafclub.com/health?type=full');
const health = await response.json();

datadog.gauge('mafclub.health.database.response_time',
  parseInt(health.checks.database.responseTime));
datadog.gauge('mafclub.health.memory.percentage',
  parseInt(health.checks.memory.percentage));
```

## Custom Health Checks

Добавьте свои проверки в `api/health.js`:

```javascript
async function checkExternalAPI() {
  const startTime = Date.now();

  try {
    const response = await fetch('https://external-api.com/ping');
    if (!response.ok) throw new Error('API returned ' + response.status);

    return {
      passed: true,
      responseTime: `${Date.now() - startTime}ms`
    };
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

// Добавьте в fullHealthCheck
const apiCheck = await checkExternalAPI();
result.addCheck('external_api', apiCheck.passed, apiCheck);
```

## Best Practices

1. **Быстрые проверки** - health checks должны быть < 1 секунды
2. **Не перегружайте** - liveness должен быть минимальным
3. **Cache результаты** - для non-critical checks
4. **Graceful degradation** - система может работать с degraded status

## Resources

- [Kubernetes: Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Microservices Health Check API](https://microservices.io/patterns/observability/health-check-api.html)
