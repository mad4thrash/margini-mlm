import { calculateProductMargin } from './margins';

export const CSV_PRODUCT_HEADERS = [
	'code',
	'description',
	'category',
	'listPrice',
	'supplierPrice',
	'vatRate',
	'discountPercent'
] as const;

export const CSV_PRODUCT_EXPORT_HEADERS = [
	...CSV_PRODUCT_HEADERS,
	'marginAmount',
	'marginPercent'
] as const;

export const CSV_PRODUCT_TEMPLATE = `${CSV_PRODUCT_HEADERS.join(',')}\n`;

export type CsvProductInput = {
	code: string;
	description: string;
	category: string;
	listPrice: number;
	supplierPrice: number;
	vatRate: number;
	discountPercent: number;
};

export type CsvRowError = {
	row: number;
	message: string;
};

export type CsvParseResult = {
	products: CsvProductInput[];
	errors: CsvRowError[];
};

export type CsvExportProduct = CsvProductInput;

export function createProductsCsvExport(products: CsvExportProduct[], payoutPercent: number) {
	const rows = products.map((product) => {
		const margin = calculateProductMargin({ ...product, payoutPercent });

		return [
			product.code,
			product.description,
			product.category,
			formatCsvNumber(product.listPrice),
			formatCsvNumber(product.supplierPrice),
			formatCsvNumber(product.vatRate),
			formatCsvNumber(product.discountPercent),
			margin.marginAmount.toFixed(2),
			margin.marginPercent.toFixed(2)
		];
	});

	return `${CSV_PRODUCT_EXPORT_HEADERS.join(',')}\n${rows
		.map((row) => row.map(escapeCsvCell).join(','))
		.join('\n')}${rows.length > 0 ? '\n' : ''}`;
}

export function parseProductsCsv(csv: string): CsvParseResult {
	const records = parseCsvRecords(csv);
	const products: CsvProductInput[] = [];
	const errors: CsvRowError[] = [];

	if (records.length === 0 || records[0].every((cell) => cell.trim() === '')) {
		return {
			products,
			errors: [{ row: 1, message: 'CSV header is required' }]
		};
	}

	const headers = records[0].map((header) => header.trim());
	if (!headersMatch(headers)) {
		return {
			products,
			errors: [{ row: 1, message: `CSV headers must be ${CSV_PRODUCT_HEADERS.join(',')}` }]
		};
	}

	records.slice(1).forEach((record, index) => {
		if (record.every((cell) => cell.trim() === '')) {
			return;
		}

		const rowNumber = index + 2;
		const row = Object.fromEntries(
			CSV_PRODUCT_HEADERS.map((header, columnIndex) => [header, record[columnIndex]?.trim() ?? ''])
		) as Record<(typeof CSV_PRODUCT_HEADERS)[number], string>;
		const error = validateRow(row);

		if (error) {
			errors.push({ row: rowNumber, message: error });
			return;
		}

		products.push({
			code: row.code,
			description: row.description,
			category: row.category,
			listPrice: Number(row.listPrice),
			supplierPrice: Number(row.supplierPrice),
			vatRate: Number(row.vatRate),
			discountPercent: row.discountPercent === '' ? 0 : Number(row.discountPercent)
		});
	});

	return { products, errors };
}

function headersMatch(headers: string[]) {
	return (
		headers.length === CSV_PRODUCT_HEADERS.length &&
		CSV_PRODUCT_HEADERS.every((header, index) => headers[index] === header)
	);
}

function validateRow(row: Record<(typeof CSV_PRODUCT_HEADERS)[number], string>) {
	for (const field of ['code', 'description', 'category'] as const) {
		if (row[field] === '') {
			return `${field} is required`;
		}
	}

	for (const field of ['listPrice', 'supplierPrice', 'vatRate'] as const) {
		if (!isNonNegativeNumber(row[field])) {
			return `${field} must be a valid non-negative number`;
		}
	}

	if (row.discountPercent !== '' && !isNonNegativeNumber(row.discountPercent)) {
		return 'discountPercent must be a valid non-negative number';
	}

	return '';
}

function isNonNegativeNumber(value: string) {
	if (value.trim() === '') {
		return false;
	}

	const number = Number(value);
	return Number.isFinite(number) && number >= 0;
}

function formatCsvNumber(value: number) {
	return Number.isFinite(value) ? String(value) : '0';
}

function escapeCsvCell(value: string) {
	return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function parseCsvRecords(csv: string) {
	const records: string[][] = [];
	let record: string[] = [];
	let cell = '';
	let inQuotes = false;

	for (let index = 0; index < csv.length; index += 1) {
		const character = csv[index];
		const nextCharacter = csv[index + 1];

		if (character === '"') {
			if (inQuotes && nextCharacter === '"') {
				cell += '"';
				index += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (character === ',' && !inQuotes) {
			record.push(cell);
			cell = '';
			continue;
		}

		if ((character === '\n' || character === '\r') && !inQuotes) {
			if (character === '\r' && nextCharacter === '\n') {
				index += 1;
			}
			record.push(cell);
			records.push(record);
			record = [];
			cell = '';
			continue;
		}

		cell += character;
	}

	if (cell !== '' || record.length > 0) {
		record.push(cell);
		records.push(record);
	}

	return records;
}
