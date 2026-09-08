const IDS=["musketeers","lost-boys","wonderland","oz","bennet-sisters","argonauts","round-table","gothic-horror","time-travelers"];
export function groupAvatarUrl(value){
  if(!value)return "";
  if(/^https?:\/\//i.test(String(value))) return String(value);
  return IDS.includes(value)?`https://litchain.org/branding/group-avatars/${value}.png`:"";
}
