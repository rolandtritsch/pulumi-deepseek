import * as aws from '@pulumi/aws';

import * as config from './config';
import * as compute from './compute';

// Create an EBS volume
const volume = new aws.ebs.Volume('ds-volume', {
  availabilityZone: compute.instance.availabilityZone,
  size: 500,
  tags: {
    Name: 'ds-volume',
  },
});

// Attach the EBS Volume to the instance
const volumeAttachment = new aws.ec2.VolumeAttachment('ds-volumeAttachment', {
  deviceName: config.config.deviceName,
  volumeId: volume.id,
  instanceId: compute.instance.id,
});

export { volume };