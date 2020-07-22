import { Construct } from 'constructs';
import { App, TerraformStack, TerraformOutput } from 'cdktf';
import { AwsProvider, DynamodbTable } from'./.gen/providers/aws';
import { Lambda } from './.gen/modules/terraform-aws-modules/lambda/aws';
import { ApigatewayV2 } from './.gen/modules/terraform-aws-modules/apigateway-v2/aws';


class MyStack extends TerraformStack {
  constructor(scope: Construct, name: string) {
    super(scope, name);

    new AwsProvider(this, 'aws', {
      region: "us-west-2"
    })

    // dynamodb
    const table = new DynamodbTable(this, 'ddb', {
      name: "cdktf",
      hashKey: "temp",
      attribute: [
        { name: "path", type: "S" }
      ],
      billingMode: "PAY_PER_REQUEST"
    })

    table.addOverride('hash_key', 'path')
    table.addOverride('lifecycle', { create_before_destroy: true })

        // http api
    const api = new ApigatewayV2(this, 'api', {
      name: "cdktf",
      domainName: "api.greengocloud.com",
      domainNameCertificateArn: "ENTER CERT ARN",
          // integrations: 
          //   { "$default":
          //     {lambda_arn: lambda.thisLambdaFunctionArnOutput}
          //   }
    })

    // lambda
    new Lambda(this, 'lambda', {
      functionName: "cdktf",
      sourcePath: "../lambda",
      handler: "lambda.handler",
      runtime: "nodejs12.x",
      attachPolicies: true,
      policies: ["arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"],
      allowedTriggers: 
        { APIGatewayAny: 
          {service: "apigateway", arn: api.thisApigatewayv2ApiArnOutput }
        },
      environmentVariables: 
        { HITS_TABLE_NAME: table.name }
    })

    new TerraformOutput(this, 'api_url', {
      value: api.thisApigatewayv2ApiApiEndpointOutput
    })

  }
}

const app = new App();
const stack = new MyStack(app, 'cdktf-typescript-aws-webservice');
stack.addOverride('terraform.backend', {
  remote: {
    hostname: 'app.terraform.io',
    organization: 'GreengoCloud',
    workspaces: {
      name: 'cdktf-typescript-aws-webservice'
    }
  }
});
app.synth();
