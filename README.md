# Wind Energy Simulation

Interactive Next.js simulation that estimates wind farm performance from core turbine and wind inputs.

You can tune:
- average wind speed
- rotor diameter
- number of turbines
- power coefficient and electrical efficiency
- hourly wind variability

The dashboard updates in real time with:
- average and peak farm output
- annual generation (GWh)
- capacity factor
- homes powered estimate
- yearly CO2 avoided estimate
- 24-hour wind and power profile chart

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Production build

```bash
npm run build
npm run start
```
