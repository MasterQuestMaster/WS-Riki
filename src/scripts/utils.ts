//Slugify: To make a text be normalized and readable for URLs.
export function slugify(text:any) {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}
  
export function formatDate(date:Date) {
  return date.toLocaleDateString('en-US', {
    timeZone: "UTC",
  })
}

/**
 * Removes wrapped quotes ("/') and unescapes any of that type of quote in the text (\").
 * If the text is not wrapped in quotes, no unescape will be performed.
 * @param text A fully quoted text
 * @returns The text without wrapping quotes and with unescaped inside quotes.
 */
export function unquote(text:string|undefined) {
  const trimmedText = text?.trim();
  //check empty string
  if(!trimmedText?.length) {
    return text;
  }

  //check which quote character (and return if quotes don't match).
  const frontQuote = trimmedText.charAt(0);
  const backQuote = trimmedText.charAt(trimmedText.length - 1);
  if((frontQuote != "\"" && frontQuote != "'") || frontQuote != backQuote) {
    return text;
  }

  //unwrap quotes and unescapte embedded quotes.
  return trimmedText.slice(1,-1).replaceAll("\\" + frontQuote, frontQuote);
}

export function escapeQuotes(text:string|undefined) {
  if(!text?.length)
    return text;

  //turn string to JSON, escaping quotes and backslashes, then strip the start/end quotes.
  return JSON.stringify(text).slice(1,-1);
}