/**
 * Format a first name: first letter uppercase, rest lowercase
 * Example: "JOHN" -> "John", "john" -> "John"
 */
export const formatFirstName = (firstName: string | null | undefined): string => {
  if (!firstName) return "";
  const trimmed = firstName.trim();
  if (trimmed.length === 0) return "";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
};

/**
 * Format a last name: all uppercase
 * Example: "Smith" -> "SMITH", "smith" -> "SMITH"
 */
export const formatLastName = (lastName: string | null | undefined): string => {
  if (!lastName) return "";
  return lastName.trim().toUpperCase();
};

/**
 * Format full name in the standard format: "Prénom NOM"
 * Example: formatFullName("john", "SMITH") -> "John SMITH"
 */
export const formatFullName = (
  firstName: string | null | undefined,
  lastName: string | null | undefined
): string => {
  const formattedFirst = formatFirstName(firstName);
  const formattedLast = formatLastName(lastName);

  if (!formattedFirst && !formattedLast) return "Inconnu";
  if (!formattedFirst) return formattedLast;
  if (!formattedLast) return formattedFirst;

  return `${formattedFirst} ${formattedLast}`;
};
