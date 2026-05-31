/* SBA 7(a) Business Acquisition Calculator
   Educational only. No promises, approvals, or underwriting conclusions.
*/

const els = {
	purchasePrice: document.getElementById("purchasePrice"),
	downPct: document.getElementById("downPct"),
	sellerNotePct: document.getElementById("sellerNotePct"),
	ebitda: document.getElementById("ebitda"),
	addBacksPct: document.getElementById("addBacksPct"),
	dscrTarget: document.getElementById("dscrTarget"),
	interestRate: document.getElementById("interestRate"),
	termYears: document.getElementById("termYears"),
	otherDebtService: document.getElementById("otherDebtService"),
	ownerWage: document.getElementById("ownerWage"),
	notes: document.getElementById("notes"),

	kpiLoanAmt: document.getElementById("kpiLoanAmt"),
	kpiMonthly: document.getElementById("kpiMonthly"),
	kpiDscr: document.getElementById("kpiDscr"),

	verdictPanel: document.getElementById("verdictPanel"),
	verdictTitle: document.getElementById("verdictTitle"),
	verdictBody: document.getElementById("verdictBody"),

	rowCashFlow: document.getElementById("rowCashFlow"),
	rowAnnualDebt: document.getElementById("rowAnnualDebt"),
	rowOtherDebt: document.getElementById("rowOtherDebt"),
	rowTotalDebt: document.getElementById("rowTotalDebt"),
	rowMaxDebt: document.getElementById("rowMaxDebt"),
	rowHeadroom: document.getElementById("rowHeadroom"),
	rowMaxPrice: document.getElementById("rowMaxPrice"),

	notesEcho: document.getElementById("notesEcho"),

	btnReset: document.getElementById("btnReset"),
	btnCopySummary: document.getElementById("btnCopySummary"),
	btnEmail: document.getElementById("btnEmail"),
};

function parseNumberLoose(value) {
	if (value == null) return 0;
	const cleaned = String(value).replace(/[^0-9.\-]/g, "");
	const num = Number(cleaned);
	return Number.isFinite(num) ? num : 0;
}

function clamp(n, min, max) {
	return Math.min(Math.max(n, min), max);
}

function formatMoney(n) {
	if (!Number.isFinite(n)) return "$—";
	return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatMoney2(n) {
	if (!Number.isFinite(n)) return "$—";
	return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

function formatPct(n, digits = 2) {
	if (!Number.isFinite(n)) return "—";
	return `${n.toFixed(digits)}`;
}

/* Standard amortization payment */
function monthlyPayment(principal, annualRatePct, years) {
	const r = (annualRatePct / 100) / 12;
	const n = Math.max(1, Math.round(years * 12));
	if (principal <= 0) return 0;
	if (r === 0) return principal / n;
	const pmt = principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
	return pmt;
}

/* Post height to parent for iframe auto-resize (used by embed.html). */
function postHeight() {
	try {
		const h = document.documentElement.scrollHeight;
		window.parent?.postMessage({ type: "mc_widget_height", height: h }, "*");
	} catch (_) {}
}

function compute() {
	const purchasePrice = parseNumberLoose(els.purchasePrice.value);
	const downPct = clamp(parseNumberLoose(els.downPct.value), 0, 100);
	const sellerNotePct = clamp(parseNumberLoose(els.sellerNotePct.value), 0, 100);
	const ebitda = parseNumberLoose(els.ebitda.value);
	const addBacksPct = clamp(parseNumberLoose(els.addBacksPct.value), 0, 50);
	const dscrTarget = clamp(parseNumberLoose(els.dscrTarget.value), 1.0, 3.0);
	const rate = clamp(parseNumberLoose(els.interestRate.value), 0, 40);
	const termYears = clamp(parseNumberLoose(els.termYears.value), 1, 25);
	const otherDebtService = parseNumberLoose(els.otherDebtService.value);
	const ownerWage = parseNumberLoose(els.ownerWage.value);

	// Deal structure
	const downPayment = purchasePrice * (downPct / 100);
	const sellerNote = purchasePrice * (sellerNotePct / 100);

	// Simplified loan amount model:
	// price - down - seller note
	const loanAmount = Math.max(0, purchasePrice - downPayment - sellerNote);

	const pmtMonthly = monthlyPayment(loanAmount, rate, termYears);
	const annualDebtService = pmtMonthly * 12;

	// Cash flow adjustments (conservative)
	const cashFlowAdjusted = Math.max(0, (ebitda * (1 - addBacksPct / 100)) - ownerWage);

	const totalAnnualDebtService = annualDebtService + otherDebtService;

	const dscr = totalAnnualDebtService > 0 ? (cashFlowAdjusted / totalAnnualDebtService) : 999;

	// DSCR-target max debt allowed
	const maxAnnualDebtAllowed = dscrTarget > 0 ? (cashFlowAdjusted / dscrTarget) : 0;
	const headroom = maxAnnualDebtAllowed - totalAnnualDebtService;

	// Rough implied max price:
	// If we back into max annual debt for SBA loan only, convert that to max principal.
	// This is rough: assumes same rate/term and same down% and seller note%.
	const maxAnnualForSbaLoan = Math.max(0, maxAnnualDebtAllowed - otherDebtService);
	const maxMonthlyForSbaLoan = maxAnnualForSbaLoan / 12;

	// Convert payment capacity to principal via binary search.
	let maxLoanPrincipal = 0;
	if (maxMonthlyForSbaLoan > 0 && rate >= 0 && termYears > 0) {
		let lo = 0, hi = 50_000_000; // 50M cap
		for (let i = 0; i < 40; i++) {
			const mid = (lo + hi) / 2;
			const midPmt = monthlyPayment(mid, rate, termYears);
			if (midPmt <= maxMonthlyForSbaLoan) {
				maxLoanPrincipal = mid;
				lo = mid;
			} else {
				hi = mid;
			}
		}
	}

	// Convert max loan principal into max purchase price based on down% + seller note%.
	// loan = price - price*down - price*sellerNote = price*(1 - down - sellerNote)
	const retainedPct = Math.max(0.05, 1 - (downPct / 100) - (sellerNotePct / 100));
	const impliedMaxPrice = maxLoanPrincipal / retainedPct;

	// Update UI
	els.kpiLoanAmt.textContent = formatMoney(loanAmount);
	els.kpiMonthly.textContent = formatMoney2(pmtMonthly);
	els.kpiDscr.textContent = dscr >= 50 ? "∞" : formatPct(dscr, 2);

	els.rowCashFlow.textContent = formatMoney(cashFlowAdjusted);
	els.rowAnnualDebt.textContent = formatMoney(annualDebtService);
	els.rowOtherDebt.textContent = formatMoney(otherDebtService);
	els.rowTotalDebt.textContent = formatMoney(totalAnnualDebtService);
	els.rowMaxDebt.textContent = formatMoney(maxAnnualDebtAllowed);
	els.rowHeadroom.textContent = formatMoney(headroom);
	els.rowMaxPrice.textContent = formatMoney(impliedMaxPrice);

	els.notesEcho.textContent = (els.notes.value || "").trim() ? els.notes.value.trim() : "—";

	// Verdict
	let verdict = "Adjust inputs to see an affordability verdict.";
	let verdictTitle = "—";
	let cls = "";

	if (purchasePrice <= 0 || ebitda <= 0) {
		verdictTitle = "Add purchase price + cash flow";
		verdict = "Enter a purchase price and EBITDA/SDE to estimate affordability and DSCR.";
		cls = "warn";
	} else {
		const dscrDelta = dscr - dscrTarget;

		if (dscr >= dscrTarget + 0.10) {
			verdictTitle = "Looks workable (on DSCR)";
			verdict = `Estimated DSCR (${formatPct(dscr, 2)}) is above your target (${formatPct(dscrTarget, 2)}). Next: confirm add-backs, model working capital needs, and package the deal cleanly for underwriting.`;
			cls = "good";
		} else if (dscr >= dscrTarget) {
			verdictTitle = "Borderline (tight coverage)";
			verdict = `Estimated DSCR (${formatPct(dscr, 2)}) barely meets your target (${formatPct(dscrTarget, 2)}). Small misses (rate, add-backs, expenses) can break coverage. Consider price, structure, or seller note terms.`;
			cls = "warn";
		} else {
			verdictTitle = "Likely too tight (under target)";
			verdict = `Estimated DSCR (${formatPct(dscr, 2)}) is below your target (${formatPct(dscrTarget, 2)}). You may need a lower price, more equity, a stronger seller note, or improved cash flow.`;
			cls = "bad";
		}

		// Extra guidance when headroom is negative
		if (headroom < 0) {
			verdict += ` Also: your modeled total debt service exceeds DSCR-target capacity by ${formatMoney(Math.abs(headroom))} per year.`;
		}
	}

	// Apply badge-like class to panel
	els.verdictPanel.classList.remove("good", "warn", "bad");
	if (cls) els.verdictPanel.classList.add(cls);
	els.verdictTitle.textContent = verdictTitle;
	els.verdictBody.textContent = verdict;

	postHeight();
}

function reset() {
	els.purchasePrice.value = "1250000";
	els.downPct.value = "10";
	els.sellerNotePct.value = "0";
	els.ebitda.value = "400000";
	els.addBacksPct.value = "10";
	els.dscrTarget.value = "1.25";
	els.interestRate.value = "10.5";
	els.termYears.value = "10";
	els.otherDebtService.value = "0";
	els.ownerWage.value = "0";
	els.notes.value = "";
	compute();
}

function buildSummaryText() {
	const purchasePrice = parseNumberLoose(els.purchasePrice.value);
	const downPct = parseNumberLoose(els.downPct.value);
	const sellerNotePct = parseNumberLoose(els.sellerNotePct.value);
	const ebitda = parseNumberLoose(els.ebitda.value);
	const addBacksPct = parseNumberLoose(els.addBacksPct.value);
	const dscrTarget = parseNumberLoose(els.dscrTarget.value);
	const rate = parseNumberLoose(els.interestRate.value);
	const termYears = parseNumberLoose(els.termYears.value);
	const otherDebtService = parseNumberLoose(els.otherDebtService.value);
	const ownerWage = parseNumberLoose(els.ownerWage.value);

	// Recompute so summary matches UI
	const downPayment = purchasePrice * (downPct / 100);
	const sellerNote = purchasePrice * (sellerNotePct / 100);
	const loanAmount = Math.max(0, purchasePrice - downPayment - sellerNote);
	const pmtMonthly = monthlyPayment(loanAmount, rate, termYears);
	const annualDebtService = pmtMonthly * 12;
	const cashFlowAdjusted = Math.max(0, (ebitda * (1 - addBacksPct / 100)) - ownerWage);
	const totalAnnualDebtService = annualDebtService + otherDebtService;
	const dscr = totalAnnualDebtService > 0 ? (cashFlowAdjusted / totalAnnualDebtService) : 999;

	const notes = (els.notes.value || "").trim();

	return [
		"SBA 7(a) Business Acquisition Calculator — Summary",
		`Purchase price: ${formatMoney(purchasePrice)}`,
		`Down payment: ${downPct.toFixed(2)}% (${formatMoney(downPayment)})`,
		`Seller note: ${sellerNotePct.toFixed(2)}% (${formatMoney(sellerNote)})`,
		`Assumed SBA loan amount: ${formatMoney(loanAmount)}`,
		`Rate/term assumption: ${rate.toFixed(2)}% for ${termYears} years`,
		`Estimated monthly payment: ${formatMoney2(pmtMonthly)} (annual: ${formatMoney(annualDebtService)})`,
		`Other annual debt service: ${formatMoney(otherDebtService)}`,
		`Adjusted cash flow (after haircut + owner wage): ${formatMoney(cashFlowAdjusted)}`,
		`Estimated DSCR: ${dscr >= 50 ? "∞" : dscr.toFixed(2)} (target: ${dscrTarget.toFixed(2)})`,
		notes ? `Notes: ${notes}` : null,
		"Disclaimer: Educational only; not a loan offer or approval."
	].filter(Boolean).join("\n");
}

async function copySummary() {
	const text = buildSummaryText();
	try {
		await navigator.clipboard.writeText(text);
		els.btnCopySummary.textContent = "Copied";
		setTimeout(() => (els.btnCopySummary.textContent = "Copy summary"), 1200);
	} catch (e) {
		// fallback
		const ta = document.createElement("textarea");
		ta.value = text;
		document.body.appendChild(ta);
		ta.select();
		document.execCommand("copy");
		ta.remove();
	}
	postHeight();
}

function wire() {
	const inputs = [
		els.purchasePrice, els.downPct, els.sellerNotePct, els.ebitda, els.addBacksPct,
		els.dscrTarget, els.interestRate, els.termYears, els.otherDebtService, els.ownerWage, els.notes
	];

	for (const el of inputs) {
		el.addEventListener("input", compute);
		el.addEventListener("change", compute);
	}

	els.btnReset.addEventListener("click", (e) => {
		e.preventDefault();
		reset();
	});

	els.btnCopySummary.addEventListener("click", (e) => {
		e.preventDefault();
		copySummary();
	});

	// Customize this CTA destination later (e.g., Moonshine Capital acquisition intake form)
	els.btnEmail.addEventListener("click", (e) => {
		e.preventDefault();
		// Placeholder: you can change to a Wix form URL or a mailto link.
		window.open("https://www.distilledfunding.com/", "_blank", "noopener,noreferrer");
	});

	// Recompute on load and after fonts/layout settle
	compute();
	setTimeout(postHeight, 250);
	setTimeout(postHeight, 800);
	window.addEventListener("resize", postHeight);
}

wire();
