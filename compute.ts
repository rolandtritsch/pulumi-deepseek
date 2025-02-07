import * as aws from '@pulumi/aws';

import * as config from './config';
import * as security from './security';
import * as network from './network';

// The commands to run when the instance starts
const userData = `#!/bin/bash
  # Check if the volume is already mounted
  if mount | grep ${config.config.volumeName}; then
    echo "Volume ${config.config.volumeName} already mounted!"
  else
    # Wait for the EBS volume to be attached
    while [ ! -e ${config.config.deviceNamePhysical} ]; do
      echo "Waiting for ${config.config.deviceNamePhysical} to be available..."
      sleep 5
    done

    # Create a file system on the volume
    mkfs -t ext4 ${config.config.deviceNamePhysical}
    # Create a mount point
    mkdir -p /mnt/${config.config.volumeName}
    # Mount the volume
    mount ${config.config.deviceNamePhysical} /mnt/${config.config.volumeName}
    # Ensure the volume is mounted on reboot
    echo "${config.config.deviceNamePhysical} /mnt/${config.config.volumeName} ext4 defaults,nofail 0 2" >> /etc/fstab
  fi

  # Check if the ollama service is already running
  if pgrep ollama > /dev/null; then
    echo "Ollama service already running!"
  else
    # Install the latest version of ollama
    curl -fsSL https://ollama.com/install.sh | sh

    # Create the directory for ollama models
    mkdir -p /mnt/${config.config.volumeName}/ollama-models
    chmod 775 /mnt/${config.config.volumeName}/ollama-models
    chgrp ollama /mnt/${config.config.volumeName}/ollama-models
    usermod -aG ollama ubuntu

    # Set the directory and host for the service
    echo -e "\n[Service]\nEnvironment=\"OLLAMA_MODELS=/mnt/ds-volume/ollama-models\"\nEnvironment=\"OLLAMA_HOST=0.0.0.0\"\n" >> /etc/systemd/system/ollama.service

    # (Re)Start the ollama service
    systemctl daemon-reload
    systemctl restart ollama
  fi

  # Pull the latest version(s) of the models
  /usr/local/bin/ollama pull deepseek-r1:8b
  /usr/local/bin/ollama pull llama3.1:latest

  # Refresh the package list
  sudo apt update && sudo apt upgrade -y
`;

// Create an EC2 Instance
const instance = new aws.ec2.Instance('ds-instance', {
  ami: 'ami-0da39a8bb51a828e3',
  instanceType: 'm5.2xlarge',
  keyName: security.keyPair.keyName,
  subnetId: network.subnet.id,
  tags: {
    Name: 'ds-instance',
  },
  userData: userData,
  vpcSecurityGroupIds: [security.securityGroup.id],
});

// Allocate an Elastic IP
const eip = new aws.ec2.Eip('ds-eip', {
  instance: instance.id,
  domain: "vpc",
  tags: {
      Name: 'ds-eip',
  },
});

export { instance, eip };
