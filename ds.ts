import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

import * as fs from 'fs';

// The configuration
const config = {
  deviceName: '/dev/sdf',
  deviceNamePhysical: '/dev/nvme1n1',
  volumeName: 'ds-volume',
  publicKey: pulumi.output(
    fs.readFileSync(`${process.env.HOME}/.ssh/aws.pub`, 'utf-8'),
  ),
};

// Create an AWS key pair
const keyPair = new aws.ec2.KeyPair('ds-keyPair', {
  publicKey: config.publicKey,
  tags: {
    Name: 'ds-keyPair',
  },
});

// Create a new VPC
const vpc = new aws.ec2.Vpc('ds-vpc', {
  cidrBlock: '10.0.0.0/16',
  enableDnsSupport: true,
  enableDnsHostnames: true,
  tags: {
    Name: 'ds-vpc',
  },
});

// Create an InternetGateway
const internetGateway = new aws.ec2.InternetGateway('ds-internetGateway', {
  vpcId: vpc.id,
  tags: {
    Name: 'ds-internetGateway',
  },
});

// Create a public Subnet
const subnet = new aws.ec2.Subnet('ds-subnet', {
  vpcId: vpc.id,
  cidrBlock: '10.0.1.0/24',
  mapPublicIpOnLaunch: true,
  tags: {
    Name: 'ds-subnet',
  },
});

// Create a RouteTable
const routeTable = new aws.ec2.RouteTable('ds-routeTable', {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: '0.0.0.0/0',
      gatewayId: internetGateway.id,
    },
  ],
  tags: {
    Name: 'ds-routeTable',
  },
});

// Associate the RouteTable with the subnet
new aws.ec2.RouteTableAssociation('ds-routeTableAssociation', {
  subnetId: subnet.id,
  routeTableId: routeTable.id,
});

// Create a SecurityGroup
const securityGroup = new aws.ec2.SecurityGroup('ds-securityGroup', {
  vpcId: vpc.id,
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

// The commands to run when the instance starts
const userData = `#!/bin/bash
  # Check if the volume is already mounted
  if mount | grep ${config.volumeName}; then
    echo "Volume ${config.volumeName} already mounted!"
  else
    # Wait for the EBS volume to be attached
    while [ ! -e ${config.deviceNamePhysical} ]; do
      echo "Waiting for ${config.deviceNamePhysical} to be available..."
      sleep 5
    done

    # Create a file system on the volume
    mkfs -t ext4 ${config.deviceNamePhysical}
    # Create a mount point
    mkdir -p /mnt/${config.volumeName}
    # Mount the volume
    mount ${config.deviceNamePhysical} /mnt/${config.volumeName}
    # Ensure the volume is mounted on reboot
    echo "${config.deviceNamePhysical} /mnt/${config.volumeName} ext4 defaults,nofail 0 2" >> /etc/fstab
  fi

  # Check if the ollama service is already running
  if pgrep ollama > /dev/null; then
    echo "Ollama service already running!"
  else
    # Install the latest version of ollama
    curl -fsSL https://ollama.com/install.sh | sh

    # Create the directory for ollama models
    mkdir -p /mnt/${config.volumeName}/ollama-models
    chmod 775 /mnt/${config.volumeName}/ollama-models
    chgrp ollama /mnt/${config.volumeName}/ollama-models
    usermod -aG ollama ubuntu

    # Set the directory and host for the service
    echo -e "\n[Service]\nEnvironment=\"OLLAMA_MODELS=/mnt/ds-volume/ollama-models\"\nEnvironment=\"OLLAMA_HOST=0.0.0.0\"\n" >> /etc/systemd/system/ollama.service

    # (Re)Start the ollama service
    systemctl daemon-reload
    systemctl restart ollama
  fi

  # Pull the latest version(s) of the models
  ollama pull deepseek-r1:8b
  ollama pull llama3.1:latest

  # Refresh the package list
  sudo apt update && sudo apt upgrade -y
`;

// Create an EC2 Instance
const instance = new aws.ec2.Instance('ds-instance', {
  ami: 'ami-0da39a8bb51a828e3',
  instanceType: 'g5.4xlarge',
  keyName: keyPair.keyName,
  subnetId: subnet.id,
  tags: {
    Name: 'ds-instance',
  },
  userData: userData,
  vpcSecurityGroupIds: [securityGroup.id],
});

// Create an EBS volume
const volume = new aws.ebs.Volume('ds-volume', {
  availabilityZone: instance.availabilityZone,
  size: 500,
  tags: {
    Name: 'ds-volume',
  },
});

// Attach the EBS Volume to the instance
const volumeAttachment = new aws.ec2.VolumeAttachment('ds-volumeAttachment', {
  deviceName: config.deviceName,
  volumeId: volume.id,
  instanceId: instance.id,
});

// Allocate an Elastic IP
const eip = new aws.ec2.Eip('ds-eip', {
  instance: instance.id,
  domain: "vpc",
  tags: {
      Name: 'ds-eip',
  },
});

// Export what needs to be exported
export const instanceId = instance.id;
export const instancePublicIp = instance.publicIp;
export const eipPublicIp = eip.publicIp;
