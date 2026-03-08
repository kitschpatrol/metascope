# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'form_building/version'

Gem::Specification.new do |spec|
  spec.name          = "form_building"
  spec.version       = FormBuilding::VERSION
  spec.authors       = ["murajun1978"]
  spec.email         = ["crazy.rendezvous.m.jun@gmail.com"]

  spec.summary       = %q{Supports Form Object in ActiveRecord.}
  spec.description   = %q{Supports Form Object in ActiveRecord.}
  spec.homepage      = "https://github.com/murajun1978/form_building"

  spec.files         = `git ls-files -z`.split("\x0").reject { |f| f.match(%r{^(test|spec|features)/}) }
  spec.bindir        = "exe"
  spec.executables   = spec.files.grep(%r{^exe/}) { |f| File.basename(f) }
  spec.require_paths = ["lib"]

  spec.add_development_dependency "bundler", "~> 1.9"
  spec.add_development_dependency "rake", "~> 10.0"
end
