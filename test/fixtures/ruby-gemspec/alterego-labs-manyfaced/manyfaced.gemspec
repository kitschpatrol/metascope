# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'manyfaced/version'

Gem::Specification.new do |spec|
  spec.name          = "manyfaced"
  spec.version       = Manyfaced::VERSION
  spec.authors       = ["Sergey Gernyak"]
  spec.email         = ["sergeg1990@gmail.com"]
  spec.summary       = %q{Our models may be many faced. And our goal is to provide easy and convenient way to render all of them!}
  spec.description   = %q{Write a longer description. Optional.}
  spec.homepage      = "https://github.com/alterego-labs/manyfaced"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0")
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  spec.add_development_dependency "bundler", "~> 1.6"
  spec.add_development_dependency "rake",    ">= 10.3.0"
  spec.add_development_dependency "rails",   "> 4"

  spec.add_development_dependency "rspec",          "3.2.0"
  spec.add_development_dependency "rspec-its",      "1.2.0"
  spec.add_development_dependency "pry-nav",        "0.2.3"
  spec.add_development_dependency "codeclimate-test-reporter",        "0.4.0"
end
