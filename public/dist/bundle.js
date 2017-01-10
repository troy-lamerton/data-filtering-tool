"use strict";var postchooser=angular.module("postchooser",["firebase"]);postchooser.filter("postFilter",function($location){return function(input){var filtered={};var path=$location.path();angular.forEach(input,function(post,id){if(path==="/"){if(post.marked){filtered[id]=post}}else if(path==="/unfiled"){if(!post.marked&&!post.hidden){filtered[id]=post}}else if(path==="/hidden"){if(post.hidden){filtered[id]=post}}else if(path==="/all"){filtered[id]=post}});return filtered}});"use strict";var _typeof=typeof Symbol==="function"&&typeof Symbol.iterator==="symbol"?function(obj){return typeof obj}:function(obj){return obj&&typeof Symbol==="function"&&obj.constructor===Symbol&&obj!==Symbol.prototype?"symbol":typeof obj};postchooser.controller("PostCtrl",function PostCtrl($scope,$location,$firebaseAuth,$firebaseArray,$firebaseObject,$filter){var fireRefMeta=firebase.database().ref("posts/meta");$scope.posts=$firebaseArray(fireRefMeta);$scope.$watch("posts",function(){var total=0;var remaining=0;angular.forEach($scope.posts,function(post){if(!post||!post.title){return}total++;if(post.marked===false&&post.hidden===false){remaining++}post.createdAtDate=new Date(post.createdAt*1e3);var lowerCaseTitle=post.title.toLowerCase();if(lowerCaseTitle.indexOf("testimon")>-1||lowerCaseTitle.indexOf("clicking")>-1||lowerCaseTitle.indexOf("clicked")>-1){post.highlighted=true}});$scope.totalCount=total;$scope.remainingCount=remaining;$scope.markedCount=total-remaining},true);$scope.signInWithGoogle=function(){var provider=new firebase.auth.GoogleAuthProvider;firebase.auth().signInWithPopup(provider).then(function(authData){}).catch(function(err){console.error("Authentication error",err)})};$scope.signOut=function(){firebase.auth().signOut().then(function(){$scope.user=null}).catch(function(err){console.error("Signout error",err)})};firebase.auth().onAuthStateChanged(function(user){if(user){console.log("signed in",firebase.auth().currentUser);$scope.user=user}else{$scope.user=null}$scope.$apply()});$scope.importError=function(){var error=arguments.length>0&&arguments[0]!==undefined?arguments[0]:{code:""};switch(error.code){case"Duplicate":window.alert("Post is already in the list");break;case"InvalidUrl":window.alert("URL is not a valid Reddit post url");break;default:console.error("Unexpected import error",error.message)}};$scope.addPostFromUrl=function(){if(!$scope.newPostUrl)return;var redditUrlRegex=/https:\/\/(?:www\.)?reddit\.com\/[-a-zA-Z0-9@:%._\+~#=\/]{2,256}\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/;var newPostUrl=$scope.newPostUrl;if(newPostUrl.lastIndexOf("/")===newPostUrl.length-1){newPostUrl=newPostUrl.slice(0,-1)}else{newPostUrl=newPostUrl}if(redditUrlRegex.test(newPostUrl)){var urlParts=newPostUrl.split("/");if(urlParts.length>=6){var _ret=function(){var newPostId=urlParts[urlParts.length-2];var duplicatePost=$scope.posts.find(function(post){return post.id===newPostId});if(duplicatePost){$scope.importError({code:"Duplicate"});$scope.newPostUrl="";return{v:void 0}}}();if((typeof _ret==="undefined"?"undefined":_typeof(_ret))==="object")return _ret.v}else{return $scope.importError({code:"InvalidUrl"})}var queryStringStart=newPostUrl.indexOf("?");if(queryStringStart>-1){newPostUrl=newPostUrl.slice(0,queryStringStart)}fetch(newPostUrl+".json").then(function(res){res.json().then(function(json){var postData=json[0].data.children[0].data;var title=postData.title,id=postData.id,author=postData.author,score=postData.score,created_utc=postData.created_utc,url=postData.url,selftext=postData.selftext;var newPost={id:id,title:title,author:author,score:score,url:url,createdAt:created_utc,importedByUrl:true};$scope.posts.$add(newPost);$scope.postsContent[id]=selftext;$scope.newPostUrl="";$scope.$apply()})}).catch(function(err){console.error("Error fetching reddit data",err)})}else{return $scope.importError({code:"InvalidUrl"})}};$scope.importNewPosts=function(){window.fetchNewPosts("MakingSense").then(function(newPosts){if(newPosts.length===0){console.info("No new posts on Reddit");return}var numDuplicates=0;newPosts.forEach(function(post){var duplicatePost=$scope.posts.find(function(targetPost){return targetPost.id===post.id});if(duplicatePost){numDuplicates++}else{$scope.posts.$add(post)}});if(numDuplicates>0)console.warn("The fetcher returned "+numDuplicates+" duplicate posts");console.info("Fetched "+newPosts.length+" new posts")}).catch(function(err){console.error("Import new posts error:",err)})};$scope.toggle=function(post,key){post[key]=!post[key];$scope.posts.$save(post)};$scope.showPreview={};$scope.postsContent={};$scope.togglePreview=function(postId){var show=!$scope.showPreview[postId];if(show===true){if($scope.postsContent[postId]){$scope.showPreview[postId]=true}else{var post=$scope.posts.find(function(_ref){var id=_ref.id;return id===postId});var postUrl=post.url;fetch(postUrl+".json").then(function(res){res.json().then(function(json){var postData=json[0].data.children[0].data;var selftext=postData.selftext;$scope.postsContent[postId]=selftext;$scope.showPreview[postId]=true;$scope.$apply()})}).catch(function(err){console.error("Error fetching reddit data",err)})}}else{$scope.showPreview[postId]=false}};$scope.removePost=function(post){if(window.confirm(post.title+" will be removed from the database")){$scope.posts.$remove(post)}};$scope.clearCompletedPosts=function(){$scope.posts.forEach(function(post){if(post.marked){$scope.removePost(post)}})};$scope.searchAllAuthorPosts=function(author){$scope.setSearchQuery(author);$location.path("/all")};$scope.setSearchQuery=function(query){$scope.searchQuery=query};$scope.resetSearchQuery=function(e){$location.path("/unfiled");$scope.searchQuery="";$scope.resetCheckboxes()};$scope.search=function(post){return angular.lowercase(post.title).indexOf(angular.lowercase($scope.searchQuery)||"")!==-1||angular.lowercase(post.author).indexOf(angular.lowercase($scope.searchQuery)||"")!==-1};function filterPosts(posts){var filteredPosts=posts.filter(function(post){return $scope.search(post)});filteredPosts=$filter("postFilter",$location)(filteredPosts);return filteredPosts}$scope.resetCheckboxes=function(){$scope.allMarked=false;$scope.allHidden=false};$scope.markAll=function(){$scope.allMarked=!$scope.allMarked;var filteredPosts=filterPosts($scope.posts);console.log("Set marked to:",$scope.allMarked,Object.keys(filteredPosts).length);angular.forEach(filteredPosts,function(post){post.marked=$scope.allMarked;$scope.posts.$save(post)})};$scope.hideAll=function(){$scope.allHidden=!$scope.allHidden;var filteredPosts=filterPosts($scope.posts);console.log("Set hidden to:",$scope.allHidden,Object.keys(filteredPosts).length);angular.forEach(filteredPosts,function(post){post.hidden=$scope.allHidden;$scope.posts.$save(post)})};if($location.path()===""){$location.path("/")}$scope.location=$location});"use strict";postchooser.directive("ngRightClick",function($parse){return function(scope,element,attrs){var fn=$parse(attrs.ngRightClick);element.bind("contextmenu",function(event){scope.$apply(function(){event.preventDefault();fn(scope,{$event:event})})})}});"use strict";postchooser.directive("postBlur",function(){return function(scope,elem,attrs){elem.bind("blur",function(){scope.$apply(attrs.postBlur)});scope.$on("$destroy",function(){elem.unbind("blur")})}});"use strict";postchooser.directive("postEscape",function(){var ESCAPE_KEY=27;return function(scope,elem,attrs){elem.bind("keydown",function(event){if(event.keyCode===ESCAPE_KEY){scope.$apply(attrs.postEscape)}});scope.$on("$destroy",function(){elem.unbind("keydown")})}});"use strict";postchooser.directive("postFocus",function postFocus($timeout){return function(scope,elem,attrs){scope.$watch(attrs.postFocus,function(newVal){if(newVal){$timeout(function(){elem[0].focus()},0,false)}})}});"use strict";function apply(func,thisArg,args){switch(args.length){case 0:return func.call(thisArg);case 1:return func.call(thisArg,args[0]);case 2:return func.call(thisArg,args[0],args[1]);case 3:return func.call(thisArg,args[0],args[1],args[2])}return func.apply(thisArg,args)}function onlyOnce(fn){return function(){if(fn===null)throw new Error("Callback was already called.");var callFn=fn;fn=null;callFn.apply(this,arguments)}}function overRest$1(func,start,transform){start=Math.max(start===undefined?func.length-1:start,0);return function(){var args=arguments,index=-1,length=Math.max(args.length-start,0),array=Array(length);while(++index<length){array[index]=args[start+index]}index=-1;var otherArgs=Array(start+1);while(++index<start){otherArgs[index]=args[index]}otherArgs[start]=transform(array);return apply(func,this,otherArgs)}}function rest(func,start){return overRest$1(func,start,function(val){return val})}function whilst(test,iteratee,callback){callback=onlyOnce(callback||noop);if(!test())return callback(null);var next=rest(function(err,args){if(err)return callback(err);if(test())return iteratee(next);callback.apply(null,[null].concat(args))});iteratee(next)}var index={whilst:whilst};window.async=index;"use strict";window.fetchNewPosts=function(subreddit){var MAX_POSTS_PER_ATTEMPT=100;var REQUEST_POSTS_LIMIT=50;var MAX_ATTEMPTS=6;return new Promise(function(resolve,reject){var fireRef=firebase.database().ref();fireRef.once("value").then(function(snapshot){var posts=snapshot.child("posts/meta").val();var newestToOldestPosts=Object.keys(posts).map(function(key){return posts[key]});newestToOldestPosts.sort(function(postA,postB){return postB.createdAt-postA.createdAt});var retry=true;var attemptNumber=0;var totalData=[];async.whilst(function(){return retry===true&&attemptNumber<=MAX_ATTEMPTS},function(retryCallback){totalData=[];attemptNumber++;retry=false;var finalPostId=newestToOldestPosts.find(function(post,index){if(index>=attemptNumber-1){return post&&!post.importedByUrl}}).id;var numFetches=0;var finalPostWasReached=false;var afterRedditPostId=void 0;function fetchMore(){return!finalPostWasReached&&numFetches<MAX_POSTS_PER_ATTEMPT/REQUEST_POSTS_LIMIT}function fetchPosts(callback){reddit.new(subreddit).limit(REQUEST_POSTS_LIMIT).after(afterRedditPostId).fetch(function(json){var moreData=json.data.children.filter(function(post){return!post.data.stickied});moreData=moreData.map(function(post){var _post$data=post.data,title=_post$data.title,url=_post$data.url,created_utc=_post$data.created_utc,score=_post$data.score,author=_post$data.author,id=_post$data.id;return{title:title,url:url,createdAt:created_utc,score:score,author:author,id:id}});var finalPostIndex=void 0;var finalPost=moreData.find(function(post,index){finalPostIndex=index;return post.id===finalPostId});if(finalPost){finalPostWasReached=true;moreData.splice(finalPostIndex);totalData=totalData.concat(moreData);if(totalData.length===0){return callback({code:"NoNewPosts",message:"The #"+attemptNumber+" newest in the database matched the newest post on Reddit."})}return callback()}else{totalData=totalData.concat(moreData);numFetches++;if(!fetchMore()){return callback({code:"FinalPostNotFound",message:'finalPostId "'+finalPostId+'" was not seen during the data fetching, maybe the post was deleted.'})}}if(!moreData[moreData.length-1]){return callback({code:"NoMorePosts",message:'The oldest post on the subreddit was reached without seeing the finalPost "'+finalPostId+'". Fetcher will retry with an older finalPost.'})}afterRedditPostId="t3_"+moreData[moreData.length-1].id;callback()})}function finalPostReached(err){if(attemptNumber>MAX_ATTEMPTS){retryCallback({code:"MaxAttempts",message:"Could not find the "+MAX_ATTEMPTS+" newest posts, from the database, on Reddit in the newest "+MAX_POSTS_PER_ATTEMPT+" posts"});return}if(err){switch(err.code){case"FinalPostNotFound":console.warn(err);retry=true;retryCallback();return;default:retryCallback(err);return}}var fetchData={newestPost:totalData[0],updatedAt:Date.now()};fireRef.child("fetch").set(fetchData);totalData.forEach(function(post){var selftext=post.selftext,id=post.id;delete post.selftext});retryCallback()}async.whilst(fetchMore,fetchPosts,finalPostReached)},function(err){if(err){if(err.code==="NoNewPosts")resolve(totalData);else reject(err)}resolve(totalData)})})})};"use strict";!function(window){"use strict";function listing(on,extras){return extras=extras||[],withFilters(on,["after","before","count","limit","show"].concat(extras))}function fetch(on){return{fetch:function fetch(res,err){getJSON(redditUrl(on),res,err)}}}function withFilters(on,filters){var ret={};on.params=on.params||{},filters=filters||[];for(var without=function without(object,key){var ret={};for(var prop in object){object.hasOwnProperty(prop)&&prop!==key&&(ret[prop]=object[prop])}return ret},filter=function filter(f){return"show"===f?function(){return on.params[f]="all",without(this,f)}:function(arg){return on.params[f]=arg,without(this,f)}},i=0;i<filters.length;i++){ret[filters[i]]=filter(filters[i])}return ret.fetch=function(res,err){getJSON(redditUrl(on),res,err)},ret}function redditUrl(on){var url="https://www.reddit.com/",keys=function keys(object){var ret=[];for(var prop in object){object.hasOwnProperty(prop)&&ret.push(prop)}return ret};if(void 0!==on.subreddit&&(url+="r/"+on.subreddit+"/"),url+=on.resource+".json",keys(on.params).length>0){var qs=[];for(var param in on.params){on.params.hasOwnProperty(param)&&qs.push(encodeURIComponent(param)+"="+encodeURIComponent(on.params[param]))}url+="?"+qs.join("&")}return url}function getJSON(url,res,err){get(url,function(data){res(JSON.parse(data))},err)}function get(url,res,err){var xhr=new XMLHttpRequest;xhr.open("GET",url,!0),xhr.onload=function(){return res(xhr.response)},xhr.onerror=function(){if(void 0!==err)return err(xhr.response)},xhr.send()}var reddit=window.reddit={};reddit.hot=function(subreddit){return listing({subreddit:subreddit,resource:"hot"})},reddit.top=function(subreddit){return listing({subreddit:subreddit,resource:"top"},["t"])},reddit.controversial=function(subreddit){return listing({subreddit:subreddit,resource:"controversial"},["t"])},reddit.new=function(subreddit){return listing({subreddit:subreddit,resource:"new"})},reddit.about=function(subreddit){return fetch({subreddit:subreddit,resource:"about"})},reddit.random=function(subreddit){return fetch({subreddit:subreddit,resource:"random"})},reddit.info=function(subreddit){var on={subreddit:subreddit,resource:"api/info"};return withFilters(on,["id","limit","url"])},reddit.comments=function(article,subreddit){var on={subreddit:subreddit,resource:"comments/"+article};return withFilters(on,["comment","context","depth","limit","sort"])},reddit.recommendedSubreddits=function(srnames){var on={resource:"api/recommend/sr/"+srnames};return withFilters(on,["omit"])},reddit.subredditsByTopic=function(query){var on={resource:"api/subreddits_by_topic",params:{query:query}};return fetch(on)},reddit.search=function(query,subreddit){var on={subreddit:subreddit,resource:"search",params:{q:query}};return withFilters(on,["after","before","count","limit","restrict_sr","show","sort","syntax","t"])},reddit.searchSubreddits=function(query){return listing({resource:"subreddits/search",params:{q:query}})},reddit.popularSubreddits=function(){return listing({resource:"subreddits/popular"})},reddit.newSubreddits=function(){return listing({resource:"subreddits/new"})},reddit.aboutUser=function(username){return fetch({resource:"user/"+username+"/about"})}}(window);"use strict";if(!Array.prototype.find){Object.defineProperty(Array.prototype,"find",{value:function value(predicate){if(this==null){throw new TypeError('"this" is null or not defined')}var o=Object(this);var len=o.length>>>0;if(typeof predicate!=="function"){throw new TypeError("predicate must be a function")}var thisArg=arguments[1];var k=0;while(k<len){var kValue=o[k];if(predicate.call(thisArg,kValue,k,o)){return kValue}k++}return undefined}})}"use strict";if(typeof Object.assign!="function"){Object.assign=function(target,varArgs){"use strict";if(target==null){throw new TypeError("Cannot convert undefined or null to object")}var to=Object(target);for(var index=1;index<arguments.length;index++){var nextSource=arguments[index];if(nextSource!=null){for(var nextKey in nextSource){if(Object.prototype.hasOwnProperty.call(nextSource,nextKey)){to[nextKey]=nextSource[nextKey]}}}}return to}}
//# sourceMappingURL=bundle.map