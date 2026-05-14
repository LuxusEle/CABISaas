/**
 * Formats a numeric price into a localized string with a space between 
 * the currency symbol and the value.
 */
export const formatPrice = (amount: number, currency: string = '$'): string => {
  const formattedValue = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  // Ensure there is a space between currency and value
  return `${currency} ${formattedValue}`;
};
