# CMake generated Testfile for 
# Source directory: /home/vagrant/work/project/learning/frontend/language/webassembly/examples/cjson/vendor/cJSON
# Build directory: /home/vagrant/work/project/learning/frontend/language/webassembly/examples/cjson/build/vendor/cJSON
# 
# This file includes the relevant testing commands required for 
# testing this directory and lists subdirectories to be tested as well.
add_test(cJSON_test "/home/vagrant/work/project/learning/frontend/language/webassembly/examples/cjson/build/vendor/cJSON/cJSON_test")
subdirs("tests")
subdirs("fuzzing")
