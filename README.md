# Reddit Post Archive Tool

A web interface for selecting and displaying Reddit posts from your favourite subreddit.
This project is setup to keep track of posts on the [r/MakingSense](https://www.reddit.com/r/makingsense) subreddit.

You can [see it in action here](https://makingsense.surge.sh)

### Running on your machine
~~~~
git clone https://github.com/troy-lamerton/data-filtering-tool.git
npm install
npm start
~~~~

If you get errors, you may need to globally install some dependencies
```npm install -g concurrently nodemon babel-cli budo clean-css```

To use your own Firebase database, replace the Firebase config `<script> var config = ... </script>` in the index.html file.

### Upcoming features
- Dropdown to sort posts by Author, Title, Date
- Improved design for mobile devices
- Generate interesting graphs from the posts in the archive

### Possible future features
- Give everyone the ability to import new posts
- Form to request permission to edit
  - It would need to be in a modal on the site
  - Looking for a form tool that can email me when someone fills out the form - Google forms perhaps?
