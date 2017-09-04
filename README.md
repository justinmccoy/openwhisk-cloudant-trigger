# OpenWhisk building block - Cloudant Trigger and Enhance with Watson Natual Language Understanding
Create Cloudant data processing apps with Apache OpenWhisk and Watson NLU on IBM Bluemix. 

![Sample Architecture](https://camo.githubusercontent.com/ae74d5c3edb4283d78b5fef2e5f8fabcbec0c64a/68747470733a2f2f6f70656e776869736b2d75692d70726f642e63646e2e75732d736f7574682e732d626c75656d69782e6e65742f6f70656e776869736b2f6e676f772d7075626c69632f696d672f67657474696e672d737461727465642d64617461626173652d6368616e6765732e737667)

Apache OpenWhisk is a open source cloud platform that executes funcations (called **actions**) in response to events (called **triggers**) without concern for managing the lifecycle or operations of the containers the code is executed in.

If you're not familiar with Serverless, and the OpenWhisk programming model [try the action, trigger, and rule sample first](https://github.com/IBM/openwhisk-action-trigger-rule). [You'll need a Bluemix account and the latest OpenWhisk command line tool](https://github.com/IBM/openwhisk-action-trigger-rule/blob/master/docs/OPENWHISK.md).


1. [Overview](#1-overview)
2. [Configure Cloudant](#2-configure-cloudant)
3. [Configure OpenWhisk Package and Trigger](#3-configure-openwhisk-package)
4. [Configure Watson Natural Language Understanding](#4-configure-watson-natural-language-understanding)
5. [Create OpenWhisk actions](#5-create-openwhisk-actions)

# 1. Overview
This example built on the Serverless model, shows how to create a **rule**, that responds to a **trigger** on changs to  CloudantDb, executing a CloudantDb read and update **action** when a new document is inserted.  This trigger only invokes the action if the document in Cloudant is missing the `nlu` field through a **filter function**.

![Sample Architecture](https://raw.githubusercontent.com/justinmccoy/openwhisk-enhance-with-watson-nlu/master/media/diagram1.png)
1. A new referrer document containing a `url` is added to the CloudantDb
2. Trigger event is fired on CloudantDb insert, if conditions defined by filter are met
3. OpenWhisk action responds to trigger, begins analysis
4. Watson Natural Language Understanding analyzes referrer
5. CloudantDb is updated with Watson NLU analysis of `url`

# 2. Configure CloudantDb
Log into Bluemix, create a [CloudantDb Service instance](https://console.ng.bluemix.net/catalog/services/cloudant-nosql-db/), and name it `openwhisk-cloudant`.

**Create CloudantDb Service**
![Create Cloudant Service](https://raw.githubusercontent.com/justinmccoy/openwhisk-enhance-with-watson-nlu/master/media/cloudantdb_create.png?raw=true)

**Launch the Cloudant web console and create a database named `referrers`.**

![Create Database](https://github.com/justinmccoy/openwhisk-enhance-with-watson-nlu/blob/master/media/create_db.png?raw=true)


With the CloudantDb created, credentials are needed to listen for database changes. Create and extract the username and password from the "Service Credentials" menu on the CloudantDb Service details page:

**Create / Save CloudantDb Credentials**
![Create save credentials](https://github.com/justinmccoy/openwhisk-enhance-with-watson-nlu/raw/master/media/service_credentials.png?raw=true)



From the command-line setup the following environment variables with the CloudantDb credentials identified above.

**Setup environment variables**
```bash
export CLOUDANT_INSTANCE="openwhisk-cloudant"
export CLOUDANT_USERNAME=""
export CLOUDANT_PASSWORD=""
export CLOUDANT_HOSTNAME="$CLOUDANT_USERNAME.cloudant.com"
export CLOUDANT_DATABASE="referrers"
```

# 3. Configure OpenWhisk Package and Trigger
In this demo, we will make use of the supplied OpenWhisk Cloudant package on Bluemix, which contains a set of actions and feeds that integrate with a Cloudant database. Use the OpenWhisk CLI to bind the Cloudant package using your credentials. Binding a package allows you to set the default parameters that are inherited by every action and feed in the package.  

**Download the code**

```bash
git clone https://github.com/justinmccoy/openwhisk-enhance-with-watson-nlu.git
'''

**Create an OpenWhisk package w/default parameters**
```bash
bx wsk package bind /whisk.system/cloudant "$CLOUDANT_INSTANCE" \
  --param username "$CLOUDANT_USERNAME" \
  --param password "$CLOUDANT_PASSWORD" \
  --param host "$CLOUDANT_HOSTNAME" \
  --param dbname "$CLOUDANT_DATABASE"
```

Triggers are a named channel for a class of events and can be explicitly fired by a user or fired on behalf of a user by an external event source, such as a feed. Use the code below to create a trigger to fire events when data is inserted into the `referrers` database using the _changes_ feed provided in the Cloudant package we just created.

**Create trigger on CloudantDb changes w/default parameters**
```bash
bx wsk trigger create data-inserted-trigger \
  --feed "/_/openwhisk-cloudant/changes" \
  --param dbname "$CLOUDANT_DATABASE"
```

### Update trigger adding a filter function
We're expecting a URL to be added to a document, or inserted as a new document; the trigger defined above will fire on every document change, not our desired outcome. We are only interested in documents that have a `url` field, and are missing Natural Language Understanding insights. To limit this trigger from firing on every change we need to update using a **filter function**. 


Filters are defined in the Cloudant database as design documents and contain a function that tests each object in the changes feed. Only objects that return `true` stay in the changes feed for further processing.

**design-doc.json**
```json
{
  "doc": {
    "_id": "_design/nlu",
    "filters": {
      "enhance": "function(doc, req){if (doc.url){ return true;} return false;}"
    }
  }
}
```

The OpenWhisk package created above with the default parameters of our CloudantDb service contains several actions that can now be directly invoked. From the command-line invoke the system OpenWhisk action, _write_.  This creates a new design document in our `referrers` database with a filter `nlu/enhance` identifing if documents contain the `url` field. 

**Create design-document containing filter in CloudantDb**
```bash
bx wsk action invoke /_/openwhisk-cloudant/create-document \
 --param overwrite true \
 --param-file design-doc.json \
 --param dbname "$CLOUDANT_DATABASE" \
 --result
```

The information for the new design document is printed to the screen
```json
{
    "id": "_design/nlu",
    "ok": true,
    "rev": "1-5c361ed5141bc7856d4d7c24e4daddfd"
}
```

With a filter available in the CloudantDb, update the `data-inserted-trigger` defining our newly created `enance` filter, limiting the trigger from firing unless the filter `nlu/enhance` return `true`.

```bash
bx wsk trigger update data-inserted-trigger \
 --param filter "nlu/enhance"
```


# 4. Configure Watson Natural Language Understanding
Login into Bluemix, create a new [Watson Natural Language Understanding instance](https://console.bluemix.net/catalog/services/natural-language-understanding?env_id=ibm%3Ayp%3Aus-south&taxonomyNavigation=app-services). 

**Create NLU Service in Bluemix**

![Create NLU](https://github.com/justinmccoy/openwhisk-enhance-with-watson-nlu/blob/master/media/create_nlu.png?raw=true)


Select the created service and extract the username and password from the "Service Credentials" tab in Bluemix and set these values as environment variables:

**Get Watson NLU Service Credentials**
![Get NLU Credentials](https://github.com/justinmccoy/openwhisk-enhance-with-watson-nlu/blob/master/media/nlu_credentials.png?raw=true)



**Set environment variables for use later** 
```bash
export NLU_USERNAME=""
export NLU_PASSWORD=""
```


# 5. Create OpenWhisk actions
Included in the repo is a file `enhance-with-nlu.js`. This file defines an OpenWhisk action written as a JavaScript function. This function will call the Watson Natural Language Understanding service with the `url` spectifed on the Cloudant `referrers` database document insert. 

```javascript
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');

function main(params) {
  console.log(JSON.stringify(params, null, 2));
  if (!params.url) {
    return Promise.reject('Url parameter must be set.');
  }

  if (!params.nlu_username) {
    return Promise.reject('Watson NLU username must be set.');
  }

  if (!params.nlu_password) {
    return Promise.reject('Watson NLU password must be set.');
  }

  var nlu = new NaturalLanguageUnderstandingV1({
    username: params.nlu_username,
    password: params.nlu_password,
    version_date: NaturalLanguageUnderstandingV1.VERSION_DATE_2017_02_27
  });
  
  console.log('Analyzing w/Watson Natural Language Understanding');      
  
  return new Promise(function(resolve, reject) {
    nlu.analyze({
      'url': params.url,
      'features': {
        'categories': {},
        'concepts': {},
        'entities': {},
        'keywords': {},
        'emotion': {},
        'sentiment': {},
        'metadata': {},
        'relations': {},
        'semantic_roles':{}
      }
    }, function(err, response) {
       var doc = {doc: params};

       if (err) {
         console.log('error:', err);
         reject(err);
       } else {
        //console.log(JSON.stringify(response, null, 2)); 
        doc.doc.nlu = response;
        resolve(doc);
      }
    });
  });
}
```

## Create action sequence and map to trigger
Before creating our OpenWhisk action, create a package to contain our new action. Packages allow you to set default parameter values for all actions within. Our `enhance-with-nlu.js` action expects the default parameters of our Watson Natural Language Understanding service to be set.

**Create new package w/default parameters**
```bash
bx wsk package create watson-nlu \
  --param dbname "$CLOUDANT_DATABASE" \
  --param nlu_username $NLU_USERNAME \
  --param nlu_password $NLU_PASSWORD
```

**Create an OpenWhisk action from the JavaScript function that we just created within our watson-nlu package**
```bash
bx wsk action create watson-nlu/enhance-with-nlu \
  enhance-with-nlu.js
```

OpenWhisk actions are stateless code snippets that can be invoked explicitly or in response to an event. To verify the creation of our action, invoke the action explicitly using the code below and pass the parameters using the `--param` command line argument.

**Test the newly created action, passing expected parameters**
```bash
bx wsk action invoke \
  --blocking \
  --param url http://openwhisk.incubator.apache.org \
  watson-nlu/enhance-with-nlu
```

### Connecting the pieces: triggers, actions, and sequences w/Rules
Chain together multiple actions using a **sequence**. Here we will connect the cloudant `read` action with the `enhance_with_nlu` action we just created. The parameter (`url`) outputed from the cloudant `read` action will be passed automatically into our `enhance_with_nlu` action.

**Create new sequece of actions**
``` bash
bx wsk action create watson-nlu/enhance-with-nlu-cloudant-sequence \
  --sequence /_/openwhisk-cloudant/read,watson-nlu/enhance-with-nlu,/_/openwhisk-cloudant/update-document \
  --param dbname $CLOUDANT_DATABASE
```

**Rules** map triggers with actions. Create a rule that maps the database change trigger to the sequence we just created. Once this rule is created, the actions (or sequence of actions) will be executed whenever the trigger is fired in response to new data inserted into the cloudant database.

**Create new rule**
```bash
bx wsk rule create enhance-with-nlu-rule data-inserted-trigger \
  watson-nlu/enhance-with-nlu-cloudant-sequence
```

## Test everything together
Begin streaming the OpenWhisk activation log in a new terminal window (also available fromm the Bluemix GUI)
```bash
bx wsk activation poll
```

In the Cloudant dashboard, create a new document in the `referrers` database.
```json
{
  "url": "http://openwhisk.incubator.apache.org/"
}
```

View the OpenWhisk log to look for the change notification.


# Troubleshooting
Check for errors first in the OpenWhisk activation log. Tail the log on the command line with `wsk activation poll` or drill into details visually with the [monitoring console on Bluemix](https://console.ng.bluemix.net/openwhisk/dashboard).

If the error is not immediately obvious, make sure you have the [latest version of the `bx wsk` CLI installed](https://console.ng.bluemix.net/openwhisk/learn/cli). If it's older than a few weeks, download an update.
```bash
wsk property get --cliversion
```

# License
[Apache 2.0](LICENSE.txt)
