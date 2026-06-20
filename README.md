# POS App

React/Vite frontend for the workshop POS demo.

## Run Locally

```bash
npm install
cp .env.example .env
npm run dev
```

## API Configuration

POS calls `order-service` only. Configure the full service base URL:

```env
VITE_ORDER_SERVICE_URL=http://localhost:3001/order
```

For Kubernetes ingress on the same host, use the ingress path:

```env
VITE_ORDER_SERVICE_URL=/order
```

## Build

```bash
npm run build
```
