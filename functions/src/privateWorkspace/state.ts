const object = (value: unknown): value is Record<string,unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown) => typeof value === "string" && value.length <= 20000;
const strings = (value: unknown) => Array.isArray(value) && value.length <= 100 && value.every(text);
const image = (value: unknown) => value === "" || (typeof value === "string" && /^\/app\/assets\/[a-f0-9]{64}\.(png|jpg|jpeg|webp|svg)$/.test(value));
export function validReference(value: unknown): boolean {
  if(!object(value)||value.version!==3||Object.keys(value).some(k=>!["version","npcEdits","creatureArt","customItems"].includes(k)))return false;
  if(!object(value.npcEdits)||Object.keys(value.npcEdits).length>100||!object(value.creatureArt)||Object.keys(value.creatureArt).length>200||!Array.isArray(value.customItems)||value.customItems.length>200)return false;
  for(const [key,edit] of Object.entries(value.npcEdits)){
    if(!key||key.length>150||!object(edit))return false;
    for(const [field,content] of Object.entries(edit)){
      if(field==="relationships"){if(!strings(content))return false;}
      else if(field==="image"){if(!image(content))return false;}
      else if(!["role","location","motivation","story","secret","combat"].includes(field)||!text(content))return false;
    }
  }
  if(!Object.entries(value.creatureArt).every(([key,path])=>key.length<=150&&image(path)))return false;
  for(const item of value.customItems){
    if(!object(item)||!text(item.id)||!text(item.name)||item.category!=="Unique Items"||!strings(item.rules))return false;
    if(Object.keys(item).some(k=>!["id","name","category","rules","image","weight","value","description","carrying","source","kind","status","secondaryCategory","facts"].includes(k)))return false;
    if(item.image!==undefined&&!image(item.image))return false;
    for(const field of ["weight","value","description","carrying","source","kind","status","secondaryCategory"])if(item[field]!==undefined&&!text(item[field]))return false;
    if(item.facts!==undefined&&(!Array.isArray(item.facts)||item.facts.length>50||!item.facts.every(f=>object(f)&&Object.keys(f).every(k=>["label","value"].includes(k))&&text(f.label)&&text(f.value))))return false;
  }
  return true;
}
