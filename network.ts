import * as aws from '@pulumi/aws';

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
const routeTableAssociation = new aws.ec2.RouteTableAssociation('ds-routeTableAssociation', {
  subnetId: subnet.id,
  routeTableId: routeTable.id,
});

export { vpc, subnet };