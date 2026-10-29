/**
 * Reference climates for engineering analogues.
 * Monthly mean air temperature, °C. ESTIMATE / MEDIUM-LOW: rounded from 1991–2020 normals,
 * to be replaced by an ERA5/Open-Meteo download. Used only to rank "climate twins".
 */
export interface ClimateBenchmark {
  id: string;
  name: string;
  country: string;
  monthlyTempC: number[];
}

export const CLIMATE_BENCHMARKS: ClimateBenchmark[] = [
  { id: "krakow", name: "Краків (PL)", country: "PL", monthlyTempC: [-1.0, 0.2, 4.0, 9.8, 14.5, 18.0, 19.8, 19.4, 14.5, 9.4, 4.4, 0.3] },
  { id: "rzeszow", name: "Жешув (PL)", country: "PL", monthlyTempC: [-1.8, -0.6, 3.3, 9.5, 14.4, 17.9, 19.7, 19.2, 14.1, 8.9, 3.9, -0.4] },
  { id: "praha", name: "Прага (CZ)", country: "CZ", monthlyTempC: [0.0, 1.2, 4.9, 10.2, 14.6, 18.2, 20.1, 19.7, 14.7, 9.6, 4.5, 1.2] },
  { id: "dresden", name: "Дрезден (DE, схід)", country: "DE", monthlyTempC: [0.8, 1.8, 5.2, 10.2, 14.4, 17.9, 19.8, 19.5, 14.8, 10.0, 5.2, 2.0] },
  { id: "munchen", name: "Мюнхен (DE, Баварія)", country: "DE", monthlyTempC: [-0.2, 0.8, 4.8, 9.3, 13.6, 17.3, 19.2, 18.8, 14.2, 9.5, 4.1, 0.7] },
  { id: "salzburg", name: "Зальцбург (AT)", country: "AT", monthlyTempC: [-0.9, 0.4, 4.4, 8.9, 13.3, 16.8, 18.7, 18.3, 13.9, 9.2, 3.7, 0.0] },
  { id: "vilnius", name: "Вільнюс (LT)", country: "LT", monthlyTempC: [-3.5, -2.7, 1.3, 7.8, 13.5, 16.6, 19.0, 18.0, 13.0, 7.8, 2.4, -1.8] },
  { id: "kobenhavn", name: "Копенгаген (DK)", country: "DK", monthlyTempC: [1.9, 1.9, 3.9, 8.0, 12.4, 15.5, 18.1, 17.9, 14.4, 10.3, 6.1, 3.4] },
];
