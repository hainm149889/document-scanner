require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "rn-document-scanner"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/example/rn-document-scanner"
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => "13.4" }
  s.source       = { :git => "https://github.com/example/rn-document-scanner.git", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.module_name  = "RNDocumentScanner"

  s.dependency "React-Core"
  s.dependency "NitroModules"

  # Tự động tích hợp C++ / Swift generated files từ Nitrogen
  load 'nitrogen/generated/ios/RNDocumentScanner+autolinking.rb'
  add_nitrogen_files(s)
end