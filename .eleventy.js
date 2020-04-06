const { DateTime } = require("luxon");
const CleanCSS = require("clean-css");
const UglifyJS = require("uglify-es");
const sanitizeHTML = require('sanitize-html')
const htmlmin = require("html-minifier");
const widont = require("widont");
const md = require("markdown-it")({
  html: true,
  linkify: true,
  typographer: true,
});
const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const inclusiveLangPlugin = require("@11ty/eleventy-plugin-inclusive-language");

module.exports = function(eleventyConfig) {

  // Date formatting (human readable)
  eleventyConfig.addFilter("readableDate", date => {
    return DateTime.fromJSDate(date).toFormat("dd LLL yyyy");
  });

  // Date formatting (machine readable)
  eleventyConfig.addFilter("machineDate", date => {
    return DateTime.fromJSDate(date).toISO();
  });

  // Markdownify
  eleventyConfig.addFilter("markdownify", text => {
    return md.renderInline( text );
  });

  // unSluggify
  eleventyConfig.addFilter("unslug", text => {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    return text.replace(/-/g, ' ');
  });

  // Name List
  eleventyConfig.addShortcode("NameList", names => {
    let strings = [],
        string = "",
        count = names.length;
    while ( count-- )
    {
      let url = names[count].url || `https://twitter.com/${names[count].twitter}/`;
      strings.unshift( `<a href="${url}">${names[count].name}</a>` );
    }
    count = strings.length;
    if ( count > 2 )
    {
      strings[count-1] = "and " + strings[count-1];
      string = strings.join(", ");
    }
    else if ( count == 2 )
    {
      string = `${strings[0]} and ${strings[1]}`;
    }
    else
    {
      string = strings[0];
    }
    return `${string}`;
  });

  // Fix proper nouns
  eleventyConfig.addFilter("fixNames", text => {
    let test = text.toLowerCase(),
        acronyms = [ "html", "css", "svg" ],
        camel_case = [ "JavaScript" ],
        i, proper_name;
    
    if ( acronyms.indexOf( test ) > -1 )
    {
      return text.toUpperCase();
    }
    else
    {
      for ( i in camel_case )
      {
        proper_name = camel_case[i];
        if ( proper_name.toLowerCase() == test )
        {
          return proper_name;
        }
      }
    }
    return text;
  });  

  // Widont
  eleventyConfig.addFilter("widont", function(text) {
    return `${widont( text )}`;
  });

  
  // Minify CSS
  eleventyConfig.addFilter("cssmin", function(code) {
    return new CleanCSS({}).minify(code).styles;
  });

  // Minify JS
  eleventyConfig.addFilter("jsmin", function(code) {
    let minified = UglifyJS.minify(code);
    if (minified.error) {
      console.log("UglifyJS error: ", minified.error);
      return code;
    }
    return minified.code;
  });

  // Minify HTML output
  eleventyConfig.addTransform("htmlmin", function(content, outputPath) {
    if (outputPath.indexOf(".html") > -1) {
      let minified = htmlmin.minify(content, {
        useShortDoctype: true,
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true
      });
      minified = minified.replace('\u00a0', '<b class="shy">\u00a0</b>');
      return minified;
    }
    return content;
  });

  // Minify JS output
  eleventyConfig.addTransform("jsmin", function(content, outputPath) {
    if (outputPath.indexOf(".js") > -1) {
      let minified = UglifyJS.minify(content);
      return minified;
    }
    return content;
  });

  // limit filter
  eleventyConfig.addNunjucksFilter("limit", function(array, limit) {
    return array.slice(0, limit);
  });

  eleventyConfig.addCollection("devs", collection => {
    // get unsorted items
    return collection.getAll().filter( item => {
      return item.inputPath.indexOf("devs/") > -1;
    });
  });
  eleventyConfig.addFilter("extractID", url => {
    url = url.split("/");
    return url[2];
  });

  eleventyConfig.addCollection("tags", function(collection) {
    // get unsorted items
    var tags = [];
    collection.getAll()
      .map( item => {
        if ( item.inputPath.indexOf("wants/") > -1 )
        {
          item.data.tags.map( tag => {
            if ( tags.indexOf( tag ) < 0 )
            {
              tags.push( tag );
            }
          });
        }
      });
    return tags.sort();
  });

  eleventyConfig.addFilter("toString", function(collection, separator, props) {
    var ret = [],
        i = collection.length;
    while ( i-- )
    {
      let str = [],
          j = props.length;
      while ( j-- )
      {
        let text = collection[i].data[props[j]];
        if ( props[j].indexOf("date") > -1 )
        {
          text = new Date( text );
          text = DateTime.fromJSDate(text).toFormat("dd LLL yyyy");
        }
        str.unshift( text );
      }
      ret.unshift( str.join( separator ) );
    }
    return ret;
  });

  eleventyConfig.addFilter("getDirectory", function(url) {
    url = url.split('/');
    return url[1];
  });

  // Don't process folders with static assets e.g. images
  eleventyConfig.addPassthroughCopy("sw.js");
  eleventyConfig.addPassthroughCopy("static/img");
  eleventyConfig.addPassthroughCopy("static/js");
  eleventyConfig.addPassthroughCopy("manifest.json");
  eleventyConfig.addPassthroughCopy("admin");
  // eleventyConfig.addPassthroughCopy("_includes/assets/");

  /* Markdown Plugins */
  let markdownIt = require("markdown-it");
  let markdownItAnchor = require("markdown-it-anchor");
  let options = {
    html: true,
    breaks: true,
    linkify: true
  };
  let opts = {
    permalink: false
  };

  eleventyConfig.setLibrary("md", markdownIt(options)
    .use(markdownItAnchor, opts)
  );

  eleventyConfig.addPlugin(syntaxHighlight);

  //eleventyConfig.addPlugin(inclusiveLangPlugin);

  return {
    templateFormats: ["md", "njk", "html", "liquid"],

    // If your site lives in a different subdirectory, change this.
    // Leading or trailing slashes are all normalized away, so don’t worry about it.
    // If you don’t have a subdirectory, use "" or "/" (they do the same thing)
    // This is only used for URLs (it does not affect your file structure)
    pathPrefix: "/",

    markdownTemplateEngine: "liquid",
    htmlTemplateEngine: "njk",
    dataTemplateEngine: "njk",
    passthroughFileCopy: true,
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
};
