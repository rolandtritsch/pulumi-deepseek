import * as fs from 'fs';

// The configuration
const config = {
  deviceName: '/dev/sdf',
  deviceNamePhysical: '/dev/nvme1n1',
  volumeName: 'ds-volume',
  publicKey: fs.readFileSync(`${process.env.HOME}/.ssh/aws.pub`, 'utf-8'),
};

export { config };
