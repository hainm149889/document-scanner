cmake_minimum_required(VERSION 3.18.1)
project(RNDocumentScanner)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Define the C++ library
add_library(RNDocumentScanner SHARED
  src/main/cpp/cpp-adapter.cpp
)

# Include Nitrogen autolinking setup
include(${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/RNDocumentScanner+autolinking.cmake)
