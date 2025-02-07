import * as compute from './compute';
import * as storage from './storage';

export const instanceId = compute.instance.id;
export const instancePublicIp = compute.instance.publicIp;
export const eipPublicIp = compute.eip.publicIp;
export const volumeId = storage.volume.id;
