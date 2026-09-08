export const PROFILE_AVATARS = [
  "austen","shakespeare","poe","twain","holmes","ahab","quixote","dracula","alice"
].map(id => ({ id, image: `https://litchain.org/branding/avatars/${id}.png` }));

export function profileAvatarUrl(value) {
  if (!value) return "";
  if (/^https?:\/\//i.test(String(value))) return String(value);
  return PROFILE_AVATARS.find(a => a.id === value)?.image || "";
}
