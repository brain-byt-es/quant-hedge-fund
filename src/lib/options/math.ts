
// ============================================
// BLACK-SCHOLES & PAYOFF CALCULATIONS
// ============================================

export function normalCDF(x: number): number {
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
}

export function normalPDF(x: number): number {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

export function calculateD1D2(S: number, K: number, T: number, r: number, sigma: number) {
    if (sigma <= 0 || T <= 0) return { d1: 0, d2: 0 };
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * Math.sqrt(T));
    const d2 = d1 - sigma * Math.sqrt(T);
    return { d1, d2 };
}

export function blackScholesCall(S: number, K: number, T: number, r: number, sigma: number): number {
    if (T <= 0) return Math.max(0, S - K);
    const { d1, d2 } = calculateD1D2(S, K, T, r, sigma);
    return S * normalCDF(d1) - K * Math.exp(-r * T) * normalCDF(d2);
}

export function blackScholesPut(S: number, K: number, T: number, r: number, sigma: number): number {
    if (T <= 0) return Math.max(0, K - S);
    const { d1, d2 } = calculateD1D2(S, K, T, r, sigma);
    return K * Math.exp(-r * T) * normalCDF(-d2) - S * normalCDF(-d1);
}

export function calculateImpliedVolatility(
    optionPrice: number,
    S: number,
    K: number,
    T: number,
    r: number,
    optionType: string
): number {
    if (T <= 0 || optionPrice <= 0) return 0.3;

    const priceFn = optionType === "Call" ? blackScholesCall : blackScholesPut;
    let low = 0.01, high = 4.0, mid = 0.3;
    const tolerance = 0.0001;

    for (let i = 0; i < 100; i++) {
        mid = (low + high) / 2;
        const price = priceFn(S, K, T, r, mid);
        const diff = price - optionPrice;
        if (Math.abs(diff) < tolerance) return mid;
        if (diff > 0) high = mid; else low = mid;
    }
    return mid;
}

export const payoffFunctions = {
    "Buy Call": (s: number, strike: number, premium: number, quantity: number) => 
        (s < strike ? -premium : (s - strike) * 100 * quantity - premium),
    "Sell Call": (s: number, strike: number, premium: number, quantity: number) => 
        (s < strike ? premium : premium - (s - strike) * 100 * quantity),
    "Buy Put": (s: number, strike: number, premium: number, quantity: number) => 
        (s > strike ? -premium : (strike - s) * 100 * quantity - premium),
    "Sell Put": (s: number, strike: number, premium: number, quantity: number) => 
        (s > strike ? premium : premium - (strike - s) * 100 * quantity),
};

export interface OptionLeg {
    action: 'Buy' | 'Sell'
    optionType: 'Call' | 'Put'
    strike: number
    optionPrice: number
    quantity: number
    date: string
}

export function calculatePayoff(legs: OptionLeg[], underlyingPrice: number): number {
    return legs.reduce((acc, leg) => {
        const premium = leg.optionPrice * 100 * leg.quantity;
        const fn = payoffFunctions[`${leg.action} ${leg.optionType}` as keyof typeof payoffFunctions];
        return acc + (fn ? fn(underlyingPrice, leg.strike, premium, leg.quantity) : 0);
    }, 0);
}
