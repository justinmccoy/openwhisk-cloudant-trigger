# OpenWhisk building block - Cloudant Trigger and Enhance with Watson Natual Language Understanding
Create Cloudant data processing apps with Apache OpenWhisk and Watson on IBM Bluemix. 

![Sample Architecture](https://camo.githubusercontent.com/ae74d5c3edb4283d78b5fef2e5f8fabcbec0c64a/68747470733a2f2f6f70656e776869736b2d75692d70726f642e63646e2e75732d736f7574682e732d626c75656d69782e6e65742f6f70656e776869736b2f6e676f772d7075626c69632f696d672f67657474696e672d737461727465642d64617461626173652d6368616e6765732e737667)

If you're not familiar with the OpenWhisk programming model [try the action, trigger, and rule sample first](https://github.com/IBM/openwhisk-action-trigger-rule). [You'll need a Bluemix account and the latest OpenWhisk command line tool](https://github.com/IBM/openwhisk-action-trigger-rule/blob/master/docs/OPENWHISK.md).

This example shows how to create an action that can be integrated with the built in Cloudant changes trigger and read action to execute logic when new data is added.

1. [Overview](#1-overview)
2. [Configure Cloudant](#2-configure-cloudant)
3. [Configure Watson Natural Language Understanding](#3-configure-watson-natural-language-understanding)
4. [Create OpenWhisk actions](#4-create-openwhisk-actions)

# 1. Overview
This example shows how to create a _serverless enhancement action_ integrated with the builtin Cloudant changes trigger, read action and write action; executing logic when a new referrer url is added to the CloudantDb.

![Sample Architecture](https://raw.githubusercontent.com/justinmccoy/openwhisk-enhance-with-watson-nlu/master/media/diagram1.png)
1. A new referrer Url is added to the CloudantDb
2. Trigger on CloudantDb insert
3. OpenWhisk action begins analysis
4. Watson Natural Language Understanding categorizes referrer
5. CloudantDb is updated with category returned from analysis

# 2. Configure Cloudant
Log into Bluemix, create a [Cloudant database instance](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db/), and name it `openwhisk-cloudant`. Launch the Cloudant web console and create a database named `referrer`. Extract the username and password from the "Service Credentials" tab in Bluemix and set these values as environment variables:

```bash
export CLOUDANT_INSTANCE="openwhisk-cloudant"
export CLOUDANT_USERNAME=""
export CLOUDANT_PASSWORD=""
export CLOUDANT_HOSTNAME="$CLOUDANT_USERNAME.cloudant.com"
export CLOUDANT_DATABASE="referrer"
```

In this demo, we will make use of the OpenWhisk Cloudant package, which contains a set of actions and feeds that integrate with a Cloudant database. Use the OpenWhisk CLI to bind the Cloudant package using your credentials. Binding a package allows you to set the default parameters that are inherited by every action and feed in the package.

```bash
wsk package bind /whisk.system/cloudant "$CLOUDANT_INSTANCE" \
  --param username "$CLOUDANT_USERNAME" \
  --param password "$CLOUDANT_PASSWORD" \
  --param host "$CLOUDANT_HOSTNAME"
```

Triggers are a named channel for a class of events and can be explicitly fired by a user or fired on behalf of a user by an external event source, such as a feed. Use the code below to create a trigger to fire events when data is inserted into the "referrer" database using the "changes" feed provided in the Cloudant package we just bound.
```bash
wsk trigger create data-inserted-trigger \
  --feed "/_/openwhisk-cloudant/changes" \
  --param dbname "$CLOUDANT_DATABASE"
```

# 3. Configure Watson Natural Language Understanding
Login into Bluemix, create a [Watson Natural Language Understanding instance]().  Selected the created service and extract the username and password from the "Service Credentials" tab in Bluemix and set these calues as environment variables:
```bash
export NLU_USERNAME=""
export NLU_PASSWORD=""
```


# 3. Create OpenWhisk actions
Create a file named `enhance-with-nlu.js`. This file will define an OpenWhisk action written as a JavaScript function. This function will call the Watson Natural Language Understanding service with the 'url' spectifed on the Cloudant 'referrer' database document insert. 

```javascript
var fs = require('fs');
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');

function main(params) {
  if (!params.url) {
    return Promise.reject('Url parameter must be set.');
  }

  var nlu = new NaturalLanguageUnderstandingV1({
    username: '',  //get from package binding
    password: '',  //get from package binding
    version_date: NaturalLanguageUnderstandingV1.VERSION_DATE_2017_02_27
  });  
  
  return new Promise(function(resolve, reject) {
    nlu.analyze({
      'url': params.url,
      'features': {
        'categories': {},
      }
    }, function(err, response) {
       console.log('Invoked Watson NLU');
       if (err) {
         console.log('error:', err);
         reject(err);
       } else {
         if (response.categories[0]) {
          resolve({category: response.categories[0].label.split('/',2)[1]});
         } else {
          resolve({category: 'unknown'});
         }
      }
    });
  }); 
}
```

## Create action sequence and map to trigger
Create an OpenWhisk action from the JavaScript function that we just created.
```bash
wsk action create enhance-with-nlu enhance-with-nlu.js
```
OpenWhisk actions are stateless code snippets that can be invoked explicitly or in response to an event. To verify the creation of our action, invoke the action explicitly using the code below and pass the parameters using the `--param` command line argument.
```bash
wsk action invoke \
  --blocking \
  --param url http://openwhisk.incubator.apache.org/
  enhance-with-nlu
```
Chain together multiple actions using a sequence. Here we will connect the cloudant "read" action with the "enhance_with_nlu" action we just created. The parameter (`url`) outputed from the cloudant "read" action will be passed automatically into our "enhance_with_nlu" action.
``` bash
wsk action create enhance-with-nlu-cloudant-sequence \
  --sequence /_/openwhisk-cloudant/read,enhance-with-nlu
```

Rules map triggers with actions. Create a rule that maps the database change trigger to the sequence we just created. Once this rule is created, the actions (or sequence of actions) will be executed whenever the trigger is fired in response to new data inserted into the cloudant database.
```bash
wsk rule create set-category-rule data-inserted-trigger enhance-with-nlu-cloudant-sequence
```

## Enter data to fire a change
Begin streaming the OpenWhisk activation log in a new terminal window.
```bash
wsk activation poll
```

In the Cloudant dashboard, create a new document in the "referrer" database.
```json
{
  "url": "http://openwhisk.incubator.apache.org/"
}
```

View the OpenWhisk log to look for the change notification.


# Troubleshooting
Check for errors first in the OpenWhisk activation log. Tail the log on the command line with `wsk activation poll` or drill into details visually with the [monitoring console on Bluemix](https://console.ng.bluemix.net/openwhisk/dashboard).

If the error is not immediately obvious, make sure you have the [latest version of the `wsk` CLI installed](https://console.ng.bluemix.net/openwhisk/learn/cli). If it's older than a few weeks, download an update.
```bash
wsk property get --cliversion
```

# License
[Apache 2.0](LICENSE.txt)
