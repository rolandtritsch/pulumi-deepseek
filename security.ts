import * as aws from '@pulumi/aws';

import * as config from './config'; 
import * as network from './network';

// Create an AWS key pair
const keyPair = new aws.ec2.KeyPair('ds-keyPair', {
  publicKey: config.config.publicKey,
  tags: {
    Name: 'ds-keyPair',
  },
});

// Create a SecurityGroup
const securityGroup = new aws.ec2.SecurityGroup('ds-securityGroup', {
  vpcId: network.vpc.id,
  ingress: [
    { protocol: 'tcp', fromPort: 22, toPort: 22, cidrBlocks: ['0.0.0.0/0'] },
    {
      protocol: 'tcp',
      fromPort: 11434,
      toPort: 11434,
      cidrBlocks: ['0.0.0.0/0'],
    },
  ],
  egress: [
    { protocol: 'tcp', fromPort: 80, toPort: 80, cidrBlocks: ['0.0.0.0/0'] },
    { protocol: 'tcp', fromPort: 443, toPort: 443, cidrBlocks: ['0.0.0.0/0'] },
  ],
  tags: {
    Name: 'ds-securityGroup',
  },
});

export { keyPair, securityGroup };