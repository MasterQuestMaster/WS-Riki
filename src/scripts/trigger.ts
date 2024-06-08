import triggerConfig from "src/config/trigger-config.json";

//Add "id" attribute to the object.
const triggerInfo = Object.fromEntries(
    Object.entries(triggerConfig)
    .map(([key, value]) => [key, {id:key, ...value}])
);

export interface TriggerInfo {
    id: string,
    name: string,
    image: string
}

/** Gets the appropriate trigger infos for the triggers in the array.
 * Empty or undefined will return the "none" trigger.
 * Triggers not defined in trigger-config will return "any" trigger.
 */
export function getTriggerInfo(...triggerNames:string[]):TriggerInfo[] {
    if(!triggerNames?.length) {
        //no trigger
        return [triggerInfo["no_trigger"]];
    }

    return triggerNames.map((name) => triggerInfo[name.toLowerCase()] ?? triggerInfo["_unknown"]);
}

export function getAllTriggerInfos():TriggerInfo[] {
    //"_" are special values that are excluded.
    return Object.values(triggerInfo).filter((tr) => !tr.id.startsWith("_"));
}