// Keep editable input text separate from the numeric API payload.
export function parseGuestCounts(adults: string, children: string) {
  const adultCount = adults.trim() === "" ? NaN : Number(adults);
  const childCount = children.trim() === "" ? NaN : Number(children);
  const validGuestCounts = Number.isInteger(adultCount) && adultCount >= 1 && adultCount <= 20
    && Number.isInteger(childCount) && childCount >= 0 && childCount <= 20;
  return { adultCount, childCount, validGuestCounts };
}
