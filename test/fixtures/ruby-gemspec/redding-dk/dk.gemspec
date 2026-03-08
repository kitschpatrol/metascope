# -*- encoding: utf-8 -*-
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require "dk/version"

Gem::Specification.new do |gem|
  gem.name        = "dk"
  gem.version     = Dk::VERSION
  gem.authors     = ["Kelly Redding", "Collin Redding"]
  gem.email       = ["kelly@kellyredding.com", "collin.redding@me.com"]
  gem.summary     = "\"Why'd you name this repo dk?\" \"Don't know\" (this is some automated task runner thingy ala cap/rake)"
  gem.description = "\"Why'd you name this repo dk?\" \"Don't know\" (this is some automated task runner thingy ala cap/rake)"
  gem.homepage    = "https://github.com/redding/dk"
  gem.license     = 'MIT'

  gem.files         = `git ls-files`.split($/)
  gem.executables   = gem.files.grep(%r{^bin/}).map{ |f| File.basename(f) }
  gem.test_files    = gem.files.grep(%r{^(test|spec|features)/})
  gem.require_paths = ["lib"]

  gem.add_development_dependency("assert", ["~> 2.16.3"])

  gem.add_dependency("much-plugin", ["~> 0.2.0"])
  gem.add_dependency("scmd",        ["~> 3.0.3"])
  gem.add_dependency("logsly",      ["~> 1.3.3"])

end
