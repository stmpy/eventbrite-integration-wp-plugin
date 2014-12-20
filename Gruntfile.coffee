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

    watch:
      coffeescript:
        files: ["./coffeescript/*.coffee"]
        tasks: ["coffee:app"]

  grunt.loadNpmTasks "grunt-contrib-watch"
  grunt.loadNpmTasks "grunt-contrib-coffee"
  grunt.loadNpmTasks "grunt-notify"

  grunt.registerTask "default", "coffee"
