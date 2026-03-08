# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'c/version'

Gem::Specification.new do |spec|
  spec.name          = 'c'
  spec.version       = C::VERSION
  spec.author        = 'Rozzy'
  spec.email         = 'berozzy@gmail.com'
  spec.description   = %q{Turns your domain into awesome files repository.}
  spec.summary       = spec.description
  spec.homepage        = 'https://github.com/rozzy/c'
  spec.license       = 'MIT'

  spec.files         = `git ls-files`.split($/)
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ['lib']

  spec.add_development_dependency 'bundler', '~> 1.3'
  spec.add_development_dependency 'sinatra', '>= 1.3'
  spec.add_development_dependency 'rake'
end