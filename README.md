# Margini-mlm

## Italiano

Margini-mlm e un'app browser-first per aziende che vendono prodotti attraverso network marketing. Consente di gestire un elenco prodotti, applicare lo sconto al prezzo di listino, sottrarre IVA, costo fornitore e payout per incaricate alla vendita, e confrontare margine netto e percentuale in tempo reale.

Il progetto e open source ed e distribuito con licenza MIT. Vedi [LICENSE](LICENSE).

### Funzionalita

- Tabella prodotti modificabile con codice, descrizione, categoria, prezzo di listino, prezzo fornitore, IVA e sconto.
- Calcolo immediato di margine netto e margine percentuale, inclusi gli effetti del payout salvato.
- Impostazione persistente della percentuale payout.
- Download del template CSV, importazione prodotti e aggiornamento per codice prodotto.
- Esportazione CSV dei dati visibili, incluse modifiche non ancora salvate e margini calcolati.
- Simulazione ordini e promozioni con confronto di fatturato lordo, margine totale e margine percentuale.
- Persistenza locale con SQLite tramite Prisma.

### Requisiti

- Node.js compatibile con le dipendenze del progetto.
- npm.

### Installazione e sviluppo

Installa le dipendenze:

```sh
npm install
```

Inizializza o aggiorna il database SQLite locale:

```sh
npx prisma migrate dev
npx prisma generate
```

Avvia il server di sviluppo:

```sh
npm run dev
```

Controlli utili:

```sh
npm test
npm run check
npm run build
```

### Database locale

L'app usa SQLite. I file database locali come `dev.db`, `dev.db-wal`, `dev.db-shm` e `dev.db-journal` sono ignorati da git e non devono essere committati. Schema Prisma e migrazioni restano invece versionati.

### Template CSV importazione

Il template CSV contiene queste intestazioni:

```csv
code,description,category,listPrice,supplierPrice,vatRate,discountPercent
```

`payoutPercent` non fa parte dell'import CSV: viene gestito dalle impostazioni dell'app. Durante l'importazione, le righe valide vengono create o aggiornate usando `code` come chiave; le righe non valide vengono riportate con errori a livello di riga.

### Esportazione CSV

L'esportazione include le righe attualmente visibili nell'interfaccia, anche quando contengono modifiche non ancora salvate. Il file esportato include anche `marginAmount` e `marginPercent`, calcolati con il payout corrente.

### Impostazioni payout

La sezione `Impostazioni` salva la percentuale payout per le incaricate alla vendita. Il valore deve essere una percentuale non negativa e viene persistito in SQLite. Dopo il reload, i margini prodotto usano il payout salvato.

### Simulazioni ordini e promozioni

La sezione `Simulazioni` usa i prodotti salvati per generare ordini casuali e confrontare scenari commerciali selezionabili. Tutti gli scenari sono attivi di default e possono essere esclusi con checkbox; `Rilancia simulazione` rigenera un unico set di ordini e lo riusa per tutti gli scenari selezionati.

Gli scenari includono DB/base, sconti 10%, 20%, 25% e 30%, 3x2, 4x3, 3x2 no KIT e 4x3 no KIT. Ogni lancio usa almeno 1000 ordini: 5% con 1 prodotto, 47,5% con multipli di 3 scelti tra 3, 6, 9 e 12 prodotti, e 47,5% con multipli di 4 scelti tra 4, 8 e 12 prodotti. Ogni ordine ha al massimo 12 prodotti. Negli scenari no KIT, la categoria `KIT` e esclusa dal conteggio del bundle e riceve lo sconto DB piu 20%.

### Formula margine

```text
discountedGrossPrice = listPrice * (1 - discountPercent / 100)
netRevenue = discountedGrossPrice / (1 + vatRate / 100)
payoutAmount = discountedGrossPrice * payoutPercent / 100
marginAmount = netRevenue - supplierPrice - payoutAmount
marginPercent = netRevenue > 0 ? marginAmount / netRevenue * 100 : 0
```

## English

Margini is a browser-first app for companies that sell products through network marketing. It helps manage products, apply list-price discounts, subtract VAT, supplier cost, and sales-representative payout, then compare net and percentage margins in real time.

The project is open source under the MIT License. See [LICENSE](LICENSE).

### Features

- Editable product table with code, description, category, list price, supplier price, VAT rate, and discount.
- Live net margin and margin percentage calculations, including the saved payout setting.
- Persistent payout percentage setting.
- CSV template download, product import, and product updates by product code.
- CSV export of visible data, including unsaved edits and calculated margins.
- Order and promotion simulations comparing gross revenue, total margin, and margin percentage.
- Local SQLite persistence through Prisma.

### Requirements

- Node.js compatible with the project dependencies.
- npm.

### Setup and Development

Install dependencies:

```sh
npm install
```

Initialize or update the local SQLite database:

```sh
npx prisma migrate dev
npx prisma generate
```

Start the development server:

```sh
npm run dev
```

Useful checks:

```sh
npm test
npm run check
npm run build
```

### Local Database

The app uses SQLite. Local database files such as `dev.db`, `dev.db-wal`, `dev.db-shm`, and `dev.db-journal` are ignored by git and must not be committed. Prisma schema and migrations are tracked.

### CSV Import Template

The CSV template contains these headers:

```csv
code,description,category,listPrice,supplierPrice,vatRate,discountPercent
```

`payoutPercent` is not part of CSV import; it is managed in the app settings. During import, valid rows are created or updated using `code` as the key, while invalid rows are reported with row-level errors.

### CSV Export

CSV export includes the rows currently visible in the interface, even when they contain unsaved edits. The exported file also includes `marginAmount` and `marginPercent`, calculated with the current payout percentage.

### Payout Settings

The `Impostazioni` section saves the payout percentage for sales representatives. The value must be a non-negative percentage and is persisted to SQLite. After reload, product margins use the saved payout.

### Order and Promotion Simulations

The `Simulazioni` section uses saved products to generate random orders and compare selectable commercial scenarios. All scenarios are active by default and can be removed with checkboxes; `Rilancia simulazione` regenerates one order set and reuses it for every selected scenario.

Scenarios include DB/base, 10%, 20%, 25%, and 30% discounts, 3x2, 4x3, 3x2 no KIT, and 4x3 no KIT. Each run uses at least 1000 orders: 5% with 1 product, 47.5% with multiples of 3 chosen from 3, 6, 9, and 12 products, and 47.5% with multiples of 4 chosen from 4, 8, and 12 products. Each order has at most 12 products. In no-KIT scenarios, category `KIT` is excluded from bundle counting and receives the DB discount plus 20%.

### Margin Formula

```text
discountedGrossPrice = listPrice * (1 - discountPercent / 100)
netRevenue = discountedGrossPrice / (1 + vatRate / 100)
payoutAmount = discountedGrossPrice * payoutPercent / 100
marginAmount = netRevenue - supplierPrice - payoutAmount
marginPercent = netRevenue > 0 ? marginAmount / netRevenue * 100 : 0
```
