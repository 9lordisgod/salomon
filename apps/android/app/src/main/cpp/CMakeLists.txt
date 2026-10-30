cmake_minimum_required(VERSION 3.22.1)
project(salomon_jni)

add_library(salomon_core SHARED IMPORTED)
set_target_properties(salomon_core PROPERTIES IMPORTED_LOCATION
    ${CMAKE_SOURCE_DIR}/../jniLibs/${ANDROID_ABI}/libsalomon_core.so)

add_library(salomon_jni SHARED salomon_jni_shim.c)
find_library(log-lib log)
target_link_libraries(salomon_jni salomon_core ${log-lib})
