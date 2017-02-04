/*global postchooser, angular, firebase */
'use strict';

/**
 * The main controller for the app. The controller:
 * - retrieves and persists the model via the $firebaseArray service
 * - exposes the model to the template and provides event handlers
 */
postchooser.controller('PostCtrl', function PostCtrl(
	$scope,
	$location,
	$firebaseAuth,
	$firebaseArray,
	$firebaseObject,
	$filter) {

	const fireRefMeta = firebase.database().ref('posts/meta');

	// Bind the posts to the firebase provider.
	$scope.posts = $firebaseArray(fireRefMeta);

	$scope.$watch('posts', function () {
		let total = 0;
		let remaining = 0;
		angular.forEach($scope.posts, function (post) {
			// Skip invalid entries so they don't break the entire app.
			if (!post || !post.title) {
				return;
			}

			total++;
			if (post.marked === false && post.hidden === false) {
				remaining++;
			}
			// convert createdAt to a date object
			// note that date is in UTC timezone but browser displays it as user's timezone
			post.createdAtDate = new Date(post.createdAt * 1000)
			const lowerCaseTitle = post.title.toLowerCase()
			if (lowerCaseTitle.indexOf('testimon') > -1
				|| lowerCaseTitle.indexOf('clicking') > -1
				|| lowerCaseTitle.indexOf('clicked') > -1) {
				post.highlighted = true;
			}
		});
		$scope.totalCount = total;
		$scope.remainingCount = remaining;
		$scope.markedCount = total - remaining;
	}, true);

	$scope.signInWithGoogle = function () {
		const provider = new firebase.auth.GoogleAuthProvider();
		firebase.auth().signInWithPopup(provider).then(function(authData) {
		}).catch(function(err) {
			console.error('Authentication error', err);
		});
	}

	$scope.signOut = function () {
		firebase.auth().signOut().then(function() {
		  // Sign-out successful.
	    $scope.user = null;
		}).catch(function(err) {
		  // An error happened.
			console.error('Signout error', err);
		});
	}

	firebase.auth().onAuthStateChanged(function(user) {
	  if (user) {
	    // User is signed in
			console.log('signed in', firebase.auth().currentUser);
			$scope.user = user;
	  } else {
	    // No user is signed in
	    $scope.user = null;
	  }
	  $scope.$apply(); // refreshes the view, this is neccessary to update the sign in buttons
	});


	$scope.importError = (error = {code: ''}) => {
		switch (error.code) {
			case 'Duplicate':
				window.alert('Post is already in the list');
				break;
			case 'InvalidUrl':
				window.alert('URL is not a valid Reddit post url');
				break;
			default:
				console.error('Unexpected import error', error.message);
		}
	}

	$scope.addPostFromUrl = function () {
		if (!$scope.newPostUrl) return;
		const redditUrlRegex = /https:\/\/(?:www\.)?reddit\.com\/[-a-zA-Z0-9@:%._\+~#=\/]{2,256}\b([-a-zA-Z0-9@:%_\+.~#?&\/\/=]*)/;
		let newPostUrl = $scope.newPostUrl;
		if (newPostUrl.lastIndexOf('/') === newPostUrl.length - 1) {
			newPostUrl = newPostUrl.slice(0, -1)
		} else {
			newPostUrl = newPostUrl;
		}
		if (redditUrlRegex.test(newPostUrl)) {
			const urlParts = newPostUrl.split('/');
			if (urlParts.length >= 6) {
				// check if this post is already in the list
				const newPostId = urlParts[urlParts.length-2]
				const duplicatePost = $scope.posts.find(function(post) {
					return post.id === newPostId;
				});
				if (duplicatePost) {
					$scope.importError({code: 'Duplicate'}); 
					$scope.newPostUrl = '';
					return;
				}
			}
			else {
				return $scope.importError({code: 'InvalidUrl'});
			}

			const queryStringStart = newPostUrl.indexOf('?');
			if (queryStringStart > -1) {
				newPostUrl = newPostUrl.slice(0, queryStringStart);
			}
			$scope.fetching = true;
			fetch(newPostUrl + '.json')
				.then(function(res) {
					res.json().then(function(json) {
						const postData = json[0].data.children[0].data;
						const { title, id, author, score, created_utc, url, selftext } = postData;
						const newPost = {
							id,
							title,
							author,
							score,
							url,
							createdAt: created_utc,
							importedByUrl: true
						};
						$scope.posts.$add(newPost);
						// keep post content in memory so we can show it quicker 
						$scope.postsContent[id] = selftext;
						$scope.newPostUrl = '';
						$scope.fetching = false;
						$scope.$apply();
					})
				})
				.catch(err => {
					$scope.fetching = false;
					$scope.$apply();
					console.error('Error fetching reddit data', err);
				});
		} else {
			return $scope.importError({code: 'InvalidUrl'});
		}
	};

	$scope.importNewPosts = function () {
		$scope.fetching = true;
		window.fetchNewPosts('MakingSense')
			.then(newPosts => {
				$scope.fetching = false;
				$scope.$apply();
				if (newPosts.length === 0) {
					console.info('No new posts on Reddit');
					return;
				}
				let numDuplicates = 0;
				newPosts.forEach(post => {
					const duplicatePost = $scope.posts.find(function(targetPost) {
						return targetPost.id === post.id;
					});
					if (duplicatePost) {
						numDuplicates++;
					} else {
						$scope.posts.$add(post);
					}
				});
				if (numDuplicates > 0) console.warn(`The fetcher returned ${numDuplicates} duplicate posts`);
				console.info(`Fetched ${newPosts.length} new posts`);
			})
			.catch(err => {
				$scope.fetching = false;
				$scope.$apply();
				console.error('Import new posts error:', err);
			});
	}

	$scope.toggle = function (post, key) {
		post[key] = !post[key];
		$scope.posts.$save(post);
	};

	$scope.showPreview = {};
	$scope.postsContent = {};

	$scope.togglePreview = function (postId) {
		const show = !$scope.showPreview[postId];
		if (show === true) {
			if ($scope.postsContent[postId]) {
				// already fetched previously
				$scope.showPreview[postId] = true;
			} else {
				// fetch post content
				const post = $scope.posts.find((({id}) => id === postId));
				const postUrl = post.url;
				fetch(postUrl + '.json')
					.then(function(res) {
						res.json().then(function(json) {
							const postData = json[0].data.children[0].data;
							const { selftext } = postData;
							$scope.postsContent[postId] = selftext;
							$scope.showPreview[postId] = true;
							$scope.$apply();
						})
					})
					.catch(function (err) {
						console.error('Error fetching reddit data', err);
					});
			}
		} else {
			$scope.showPreview[postId] = false;
		}
	}

	$scope.removePost = function (post) {
		if (window.confirm(`${post.title} will be removed from the database`)) {
			$scope.posts.$remove(post);
		}
	};

	$scope.clearCompletedPosts = function () {
		$scope.posts.forEach(function (post) {
			if (post.marked) {
				$scope.removePost(post);
			}
		});
	};

	$scope.searchAllAuthorPosts = function (author) {
		$scope.setSearchQuery(author);
		$location.path('/all');
	}

	$scope.setSearchQuery = function (query) {
    $scope.searchQuery = query;
  };

	$scope.resetSearchQuery = function (e) {
		$location.path('/unfiled');
		$scope.searchQuery = '';
		$scope.resetCheckboxes();
	};

	$scope.search = function (post) {
    return (angular.lowercase(post.title).indexOf(angular.lowercase($scope.searchQuery) || '') !== -1 ||
      angular.lowercase(post.author).indexOf(angular.lowercase($scope.searchQuery) || '') !== -1);
  };

	function filterPosts(posts) {
		let filteredPosts = posts.filter(post => $scope.search(post));
		filteredPosts = $filter('postFilter', $location)(filteredPosts);
		return filteredPosts;
	}

	$scope.resetCheckboxes = function () {
		$scope.allMarked = false;
		$scope.allHidden = false;
	}

	$scope.markAll = function () {
		$scope.allMarked = !$scope.allMarked;
		const filteredPosts = filterPosts($scope.posts);
		console.log('Set marked to:', $scope.allMarked, Object.keys(filteredPosts).length)
		angular.forEach(filteredPosts, function (post) {
			post.marked = $scope.allMarked;
			$scope.posts.$save(post);
		});
	};

	$scope.hideAll = function () {
		$scope.allHidden = !$scope.allHidden;
		const filteredPosts = filterPosts($scope.posts);
		console.log('Set hidden to:', $scope.allHidden, Object.keys(filteredPosts).length)
		angular.forEach(filteredPosts, function (post) {
			post.hidden = $scope.allHidden;
			$scope.posts.$save(post);
		});
	};

	if ($location.path() === '') {
		$location.path('/');
	}
	$scope.location = $location;
});
