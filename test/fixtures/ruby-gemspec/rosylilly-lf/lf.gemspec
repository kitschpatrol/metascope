# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'lf/version'

Gem::Specification.new do |spec|
  spec.name          = 'lf'
  spec.version       = Lf::VERSION
  spec.authors       = ['Sho Kusano']
  spec.email         = ['rosylilly@aduca.org']
  spec.summary       = 'lf is a lightweight command-line LTSV processor'
  spec.description   = 'lf is a lightweight command-line LTSV processor'
  spec.homepage      = 'https://github.com/rosylilly/lf'
  spec.license       = 'MIT'

  spec.files         = `git ls-files -z`.split("\x0")
  spec.executables   = spec.files.grep(/^bin\//) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(/^(test|spec|features)\//)
  spec.require_paths = ['lib']

  spec.add_development_dependency 'bundler', '~> 1.6'
  spec.add_development_dependency 'rake', '~> 10.0'
  spec.add_development_dependency 'rspec', '~> 3.1.0'
  spec.add_development_dependency 'aruba', '~> 0.6.1'
  spec.add_development_dependency 'rubocop', '~> 0.26.1'
  spec.add_development_dependency 'simplecov', '~> 0.9.1'
  spec.add_development_dependency 'cucumber', '~> 1.3.17'

  spec.add_dependency 'ltsv', '~> 0.1.0'
  spec.add_dependency 'term-ansicolor', '~> 1.3.0'
end
