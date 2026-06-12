# Margini

## Italiano

Margini e un'app browser-first per aziende che vendono prodotti attraverso network marketing. Consente di gestire un elenco prodotti, applicare lo sconto al prezzo di listino, sottrarre IVA, costo fornitore e payout per incaricate alla vendita, e confrontare margine netto e percentuale in tempo reale.

Il progetto e open source ed e distribuito con licenza MIT. Vedi [LICENSE](LICENSE).

### Funzionalita

- Tabella prodotti modificabile con codice, descrizione, categoria, prezzo di listino, prezzo fornitore, IVA e sconto.
- Calcolo immediato di margine netto e margine percentuale, inclusi gli effetti del payout salvato.
- Impostazione persistente della percentuale payout.
- Download del template CSV, importazione prodotti e aggiornamento per codice prodotto.
- Esportazione CSV dei dati visibili, incluse modifiche non ancora salvate e margini calcolati.
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

### Margin Formula

```text
discountedGrossPrice = listPrice * (1 - discountPercent / 100)
netRevenue = discountedGrossPrice / (1 + vatRate / 100)
payoutAmount = discountedGrossPrice * payoutPercent / 100
marginAmount = netRevenue - supplierPrice - payoutAmount
marginPercent = netRevenue > 0 ? marginAmount / netRevenue * 100 : 0
```
