import get_field_at_path from "./implementations/object_manipulation_by_path/get_field_at_path.js";
import set_field_at_path from "./implementations/object_manipulation_by_path/set_field_at_path.js";

import isArray from "./implementations/array/isArray.js";
import toArray from "./implementations/array/toArray.js";

import Interval from "./implementations/Interval/Interval.js";

class Utils
{
    constructor() { console.error("Utils has been instantiated!"); }
    
    static get_field_at_path = get_field_at_path;
    static set_field_at_path = set_field_at_path;
    
    static isArray = isArray;
    static toArray = toArray;

    static Interval = Interval;
};
export default Utils;