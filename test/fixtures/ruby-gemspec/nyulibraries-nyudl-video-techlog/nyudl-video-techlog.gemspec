# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'nyudl/video/techlog/version'

Gem::Specification.new do |spec|
  spec.name          = "nyudl-video-techlog"
  spec.version       = Nyudl::Video::Techlog::VERSION
  spec.authors       = ["Joseph Pawletko"]
  spec.email         = ["jgpawletko@gmail.com"]
  spec.description   = %q{Gem encapsulates functionality required to deal with various video digitization techlog files generated as part of the NYU DLTS Video capture workflow.}
  spec.summary       = %q{Library for NYU DLTS Video Techlog files}
  spec.homepage      = "https://github.com/NYULibraries/nyudl-video-techlog"
  spec.license       = "MIT"

  spec.files         = `git ls-files`.split($/)
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  spec.add_development_dependency "bundler",   "~> 1.3"
  spec.add_development_dependency "rake",      "~> 10.1"
  spec.add_development_dependency "rspec",     "~> 2.14"
  spec.add_development_dependency "simplecov", "~> 0.8"

  spec.add_dependency "nokogiri", "~> 1.6"
end
