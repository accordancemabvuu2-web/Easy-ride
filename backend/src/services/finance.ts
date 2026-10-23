export interface FinanceInput {
  principal: number;
  deposit: number;
  annualInterestRate: number;
  termMonths: number;
}

export function calculateFinance(input: FinanceInput) {
  const financedAmount = input.principal - input.deposit;
  const monthlyRate = input.annualInterestRate / 100 / 12;
  const monthlyPayment = monthlyRate === 0
    ? financedAmount / input.termMonths
    : financedAmount * monthlyRate / (1 - (1 + monthlyRate) ** -input.termMonths);
  const totalRepayment = monthlyPayment * input.termMonths + input.deposit;
  return {
    estimate: true as const,
    financedAmount: Number(financedAmount.toFixed(2)),
    monthlyPayment: Number(monthlyPayment.toFixed(2)),
    totalRepayment: Number(totalRepayment.toFixed(2)),
    totalInterest: Number((totalRepayment - input.principal).toFixed(2)),
  };
}
