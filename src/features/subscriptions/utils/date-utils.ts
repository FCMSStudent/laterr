import { isValid, parseISO } from "date-fns";

export const parseSubscriptionDate = (value: string | null | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : undefined;
};
