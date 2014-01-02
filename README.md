jpr
===

A Jasmine-Phantom-Resemble module to implement a matcher that can compare images and/or snapshots.

Usage
---

Assuming that phantomjs has been installed, JPR.js can be used in the following ways after cloning the repo
and going to root folder

####To run ALL specs

   ```
   node bin/jpr
   ```

   Executes all the specs provided in the config.json and compares the generated images to the reference images.


####To run a specific spec

  1. Run a specific spec

      ```
      node bin/jpr --specFile [path/to/spec/file]
      ```

      Executes only the specified spec file

  2. Run a specific spec and compare with a specific image

      ```
      node bin/jpr --specFile [path/to/spec/file] --imageFile [path/to/image/file]
      ```
      Executes the given spec and compares the generated image to the given image file.


####Provide the image diff threshold (in %)

  ```
  node bin/jpr --threshold 0.5
  node bin/jpr --specFile [path/to/spec/file] --imageFile [path/to/image/file] --threshold 2.0
  ```
