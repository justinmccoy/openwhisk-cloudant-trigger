var fs = require('fs');
var NaturalLanguageUnderstandingV1 = require('watson-developer-cloud/natural-language-understanding/v1.js');

function main(params) {
  if (!params.url) {
    return Promise.reject('Url parameter must be set.');
  }

  var nlu = new NaturalLanguageUnderstandingV1({
    username: '63752ce6-4b2a-47bb-b117-c8757a550905',
    password: 'xaDb1r8UK2Kd',
    version_date: NaturalLanguageUnderstandingV1.VERSION_DATE_2017_02_27
  });
  
  console.log('Analyzing with Watson NLU');      

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
        console.log(JSON.stringify(response, null, 2)); 
        if (response.categories[0]) {
          resolve({category: response.categories[0].label.split('/',2)[1]});
        } else {
          resolve({category: 'unknown'});
        }
      }
    });
  
  }); //promise
}
