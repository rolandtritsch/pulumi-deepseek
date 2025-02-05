# Pulumi Stack to run large (Deepseek) LLMs

This configures a stack with an EC2 instance that can host and run LLMs served by ollama.

Namely the idea is to run models that are too big to run on the laptop.

For instance deepseek-r1:70b requires ~45GB of main-memory.

This stack is configured to run an m5.4xlarge instance with 64GB of main-memory.

It also features a 500GB ESB volume to download/pull/store the models.

The instance is available on a public ElasticIP.

You can check, if it is up and running with ...

```bash
curl http://$(pulumi stack output eipPublicIp):11434
```

The response should be `Ollama is running`.

You can `ssh` into the instance with ...

```bash
ssh -i ~/.ssh/aws.pub ubuntu@$(pulumi stack output eipPublicIp)
```

You can then configure `Cline` in `VsCode` to use that `ollama server` to answer questions.

## How to make this work?

- Clone this repo
- (Optional but recommended) Set up [aws-cli][] (using snap)
- Download [pulumi][] and follow the instuctions to set it up
- Create an ssh keyPair ...
```bash
cd ~/.ssh
ssh-keygen -t rsa -b 2048 -f aws
```
- Run `pulumi up --yes`
- Run `curl http://$(pulumi stack output eipPublicIp):11434` to check that the ollama server/service is running
- After you are done using it, do not forget to run `pulumi destroy --yes` to bring the stack down again (to avoid paying for the resources)

With that you are off to the races.

## Troubleshooting

- Sometimes the initial pull/download of the models fails. In this case you have to ...
  - ssh into the running instance with `ssh -i ~/.ssh/aws.pub ubuntu@$(pulumi stack output eipPublicIp)`
  - And pull the models (you want) manually, e.g. `ollama pull deepseek-r1:70b`
- Sometimes the ESB volume gets attached to a different physical device (and the mount will fail). In that case ...
  - ssh into the running instance with `ssh -i ~/.ssh/aws.pub ubuntu@$(pulumi stack output eipPublicIp)`
  - And run `lsblk` to find the righ 

[pulumi]: https://www.pulumi.com
[aws-cli]: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html