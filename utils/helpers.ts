
/**
 * Removes undefined properties from an object recursively.
 * Firestore does not support undefined values.
 */
export const cleanObject = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => (v && typeof v === 'object') ? cleanObject(v) : v);
  }
  
  const newObj: any = {};
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    if (value !== undefined) {
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        newObj[key] = cleanObject(value);
      } else {
        newObj[key] = value;
      }
    }
  });
  return newObj;
};
