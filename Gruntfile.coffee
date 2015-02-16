module.exports = (grunt) ->
  grunt.initConfig

    coffee:
      app:
        options:
          bare: true
        expand: true
        cwd: "./coffeescript"
        src: ["*.coffee"]
        dest: "./assets/js"
        ext: ".js"

    concat:
      app:
        src: ['./assets/js/resources.js','./assets/js/list-app.js','./assets/js/details-app.js']
        dest: './assets/js/frontend.js'

    uglify:
      app:
        src: './assets/js/frontend.js'
        dest: './assets/js/frontend.min.js'

    watch:
      coffeescript:
        files: ["./coffeescript/*.coffee"]
        tasks: ["coffee:app","concat:app"]

  grunt.loadNpmTasks "grunt-contrib-watch"
  grunt.loadNpmTasks "grunt-contrib-coffee"
  grunt.loadNpmTasks "grunt-contrib-concat"
  grunt.loadNpmTasks "grunt-contrib-uglify"
  grunt.loadNpmTasks "grunt-notify"

  grunt.registerTask "default", ["coffee","concat","uglify"]
